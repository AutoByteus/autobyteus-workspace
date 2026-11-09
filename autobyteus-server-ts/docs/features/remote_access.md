# Remote Access / Phone Access Backend

Remote Access is the backend boundary for phone/PWA pairing and mobile sessions on an AutoByteus node reached through a private network path: Tailscale, an allowed local network, or a network the node lists in `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`. The backend is **not** designed for direct public internet exposure.

Every request to a node needs a credential (the [Node Access Model](../design/node_access_model.md), autobyteus-437). A paired phone holds its `mra_...` phone credential; the desktop app holds an owner credential for each node. This document covers the Host and Origin rules that run first, phone pairing and phone credentials; the node access model owns network admission, the other credential kinds and the route permissions.

## Runtime Ownership

| Concern | Owner |
| --- | --- |
| Route permissions by client kind and the phone WebSocket routes (`routeAccessFor`, `PHONE_WEBSOCKET_ROUTES`) | `src/api/security/node-route-permissions.ts` |
| The node access gate: network admission, one credential, route permission (node access model §2) | `src/api/security/node-access-gate.ts`, `src/node-access/` |
| The node's first request rule: the Host gate (DNS rebinding defence) | `src/api/security/remote-access-host-gate.ts` |
| Allowed-host rule (classes, configured names, the paired-phone lookup on a miss) | `src/api/security/remote-access-request-host.ts`; `Host` parsing in `request-host-name.ts` |
| The browser-access settings, read once at start (`AUTOBYTEUS_ALLOWED_ORIGINS`, `AUTOBYTEUS_ALLOWED_HOSTS`, the host of `AUTOBYTEUS_SERVER_HOST`) | `src/api/security/node-browser-access.ts` |
| Fastify hook: Origin check, CORS, then the node access gate | `src/api/security/node-access-plugin.ts` |
| The refusal reply and log line of every hook | `src/api/security/request-refusal.ts` |
| Allowed-origin rules: the node's, and the tool endpoints' (`/mcp/gateway`, agent-tools and credential-proxy listeners) | `src/api/security/remote-access-request-origin.ts` |
| Hosts of open pairing sessions and active paired phones (`isPairedPhoneHost`) | `src/remote-access/services/remote-access-pairing-service.ts` |
| How a user file is answered (`sendUserFile`) | `src/api/rest/user-file-reply.ts` |
| `/ws/*` routes behind the gate (refusal → close with 4401/4403 and the code; open sockets registered for revocation) | `src/api/websocket/gated-websocket-route.ts`, `src/api/security/open-socket-registry.ts` |
| Phone credential check for the gate (prefix `mra_`, paired, not revoked, Phone Access on) | `src/remote-access/services/phone-credential-verifier.ts` |
| Phone Access settings | `src/remote-access/services/remote-access-settings-service.ts` and `stores/remote-access-settings-store.ts` |
| This computer's network facts (Tailscale, VPN, local network, computer name) and the allowed local networks | `src/remote-access/services/node-network-service.ts` with `network-interface-classifier.ts`, `default-route.ts`, `computer-name.ts`, `ip-address-ranges.ts` and `stores/allowed-local-network-store.ts` |
| Pairing session creation/exchange/discard | `src/remote-access/services/remote-access-pairing-service.ts` |
| Paired device credentials and revocation (kept in memory; a revocation closes the phone's open sockets) | `src/remote-access/services/paired-device-service.ts` and `stores/paired-device-store.ts` |
| Stable node identity (the node ID) | `src/remote-access/services/node-identity-service.ts` |
| Client-facing absolute/relative resource URLs | `src/remote-access/services/client-facing-url-resolver.ts` |
| Mobile static asset serving | `src/api/static/mobile-web.ts` |
| Sensitive URL redaction | `src/api/security/redact-sensitive-url.ts` |

## Allowed Hosts

The node's first request rule (`remote-access-host-gate.ts`, registered before every other hook): every HTTP request and every WebSocket upgrade, on any path and with or without an `Origin`, must be addressed to one of the node's names. A page an attacker re-points at the node through DNS (DNS rebinding) is same-origin with itself, so only the `Host` it was addressed by tells it apart. The port is not compared. A request whose `Host` is (`RequestHostPolicy`, `remote-access-request-host.ts`):

- an IP address (IPv4 or IPv6);
- `localhost` or a name ending `.localhost`;
- a name public DNS cannot give an attacker: a dotless name, or a name ending `.local`, `.lan`, `.home.arpa` or `.internal` (including `host.docker.internal`);
- a name ending `.ts.net` (outside a tailnet, Tailscale names resolve only to Tailscale's relays);
- the host of `AUTOBYTEUS_SERVER_HOST` or of an `AUTOBYTEUS_ALLOWED_ORIGINS` entry;
- listed in the optional node setting `AUTOBYTEUS_ALLOWED_HOSTS` (environment or the node's `.env`, read at start, default empty): comma-separated names; an entry starting with `.` covers that name and every name under it (`.corp.example` covers `corp.example` and `a.corp.example`, not `evilcorp.example`). Entries that are not names are ignored with one warning at start. There is no "allow every host" value;
- the host of an open pairing session or of an active paired phone (checked only when no class or setting matched),

passes, as does a request with no `Host` header. Names are compared lowercased, without IPv6 brackets or a trailing dot. `X-Forwarded-Host` is not read for this rule: a re-pointed page can set it. Everything else is refused before any other rule or handler: HTTP 403 `{ code: "REMOTE_ACCESS_HOST_REFUSED", message: "Requests addressed to this host name are not accepted by this node." }` (for a WebSocket, the handshake fails). The log line names the host and the setting to use: `Remote Access request refused REMOTE_ACCESS_HOST_REFUSED <redacted url> host <name> (add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)`; a malformed `Host` is logged escaped and cut at 100 characters.

Who needs the setting: a node reached through a public DNS name the node cannot recognise, such as a reverse proxy that keeps `Host` with a company domain, a peer node or desktop entry added by a DNS name, or a Docker node addressed by a service name with a dot. A Host-rewriting gateway that sets `Host` to the node's IP or `localhost` needs nothing.

## Allowed Origins

Every HTTP request and every WebSocket upgrade that passed the Host rule, on any path (`/ws/*`, `/graphql`, `/rest/remote/run-observations` and routes added later), then meets the node's allowed-origin rule, before route authorization and before any route handler. A request is allowed when its browser `Origin` header is:

- absent (the desktop app's HTTP requests, peer nodes, native and command-line clients);
- the same origin: the Origin's host[:port] equals the request's `Host`, or the first `X-Forwarded-Host` value, case-insensitive. The scheme is not compared, so a phone shell reached through Tailscale Serve (`https://<name>.ts.net`, plain HTTP to the node) is the same origin;
- exactly `file://` (the packaged desktop app's renderer). A local HTML file opened in the desktop's in-app browser does not send this: the in-app browser marks every request made by a `file://` page, and by anything the page creates, with `Origin: null` (autobyteus-416);
- listed in the optional node setting `AUTOBYTEUS_ALLOWED_ORIGINS` (environment or the node's `.env`): comma-separated exact origins such as `https://gateway.example.com`, default empty, read at server start. Entries that are not `http(s)` origins are ignored with one warning at start.

A page served from a localhost port (`localhost`, `127.0.0.0/8`, `[::1]`) is not an exception: any local program, including a dev server an agent starts, can serve one. Its origin is allowed only when listed exactly, for example `AUTOBYTEUS_ALLOWED_ORIGINS=http://localhost:5173` for a developer's own tool. The launchers in this repository list their frontend themselves: Electron development mode (its renderer's origin), the development stack (`http://127.0.0.1:3000` and `http://localhost:3000`), and the browser probes.

Everything else is refused, including `Origin: null`, other schemes and malformed values: the request gets HTTP 403 `{ code: "REMOTE_ACCESS_ORIGIN_REFUSED" }` (for a WebSocket, the handshake fails; no socket opens and nothing route-specific starts). CORS headers are granted from the same rule: an allowed Origin is reflected in `Access-Control-Allow-Origin`, a refused one gets none, and a request without Origin is answered as before.

The node's tool endpoints, whose clients are programs, have their own narrower rule (`createToolEndpointOriginPolicy`): no `Origin`, or one listed in `AUTOBYTEUS_ALLOWED_ORIGINS`. It applies to the MCP gateway (`/mcp/gateway`, its hook runs before the origin rule above, with its own preflight answer) and to the loopback agent-tools and credential-proxy listeners, which also keep their loopback client and `Host` checks.

## User Files

Every route that returns a user file's content (workspace files and the HTML preview's static route, uploaded media, composer drafts and sent-message attachments, run file changes, message references) answers through one owner, `sendUserFile` (`src/api/rest/user-file-reply.ts`): the file's own type, `Content-Security-Policy: sandbox allow-scripts` and `X-Content-Type-Options: nosniff`. Opened anywhere (a viewer, a tab, the in-app browser, an agent's browser tool) the file displays, and an HTML or SVG file's scripts run in an opaque origin, walled off from the node: its requests to the node carry `Origin: null` and are refused. PDFs render under this policy. Project Task context files keep their own `attachment` answer, and installed applications' assets are served at the node's origin by design. An architecture test (`tests/architecture/user-file-replies.test.ts`) keeps every file route on `sendUserFile`.

## Route Permissions

After the Host and Origin rules, the node access gate decides every request: network admission, then one credential, then the route's permission for that client kind ([Node Access Model](../design/node_access_model.md) §2, `node-route-permissions.ts`). For phones:

- Exempt (no credential; network admission still applies): `OPTIONS` preflight, `/mobile` and `/mobile/*`, `/rest/health`, `GET /rest/remote-access/status`, `POST /rest/remote-access/pairing-exchanges`.
- Owner actions, refused to a phone with 403 `NODE_ROUTE_NOT_PERMITTED`: `/rest/remote-access/settings`, `/rest/remote-access/network` and below, `/rest/remote-access/pairing-sessions` and below, `/rest/remote-access/devices` and below, `/rest/node-update` (a Docker node's server package version and in-place update; see `autobyteus-server-ts/docker/README.md` and the DESIGN.md rule 9 exception), `/rest/node-access/*`, `/rest/mcp-gateway/*`.
- Owner and phone, listed explicitly: `GET /rest/node-files/content?path=<absolute>` (a node file, read-only, autobyteus-436 NAS-39/40).
- Owner and phone: `POST /graphql` and the other REST families (media, files, uploads, workspaces, context files, drafts, runs, team runs, run file changes, team communication, application backend routes and bundle assets). What a phone may do inside them is slice 2.
- WebSockets: a phone credential opens only the phone WebSocket routes; every other WebSocket route is the owner's.

Phone WebSocket routes are the WebSocket route patterns a paired phone's credential may open (`PHONE_WEBSOCKET_ROUTES`): `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`, `/ws/projects`, `/ws/agent-package-definitions`, `/ws/file-explorer/:workspaceId` and `/ws/node-desktop`. A phone credential (`access_token=mra_...`) on any other WebSocket route is refused with `PHONE_ACCESS_ROUTE_REFUSED`: close code 4403 on `/ws/*` (today `/ws/terminal/...`, `/ws/update-notifications`, `/ws/applications/...`), HTTP 403 on a `/graphql` upgrade and on the peer WebSocket `/rest/remote/run-observations`. A WebSocket route added later stays closed to phones until it is added to the list. The list is keyed by Fastify route pattern (`request.routeOptions.url`), so renaming a route parameter must update it; `tests/architecture/node-access-boundaries.test.ts` fails when a listed pattern is not a registered gated route. The refusal is not a session failure: the phone does not unpair on it.

## Node Network And Ways To Connect

`GET /rest/remote-access/network` returns `{ network: NodeNetwork }`, this node's report of the computer it runs on:

```ts
type NodeNetwork = {
  computerName: string;            // macOS `scutil --get ComputerName`, else the host name without `.local`
  runsInContainer: boolean;        // `/.dockerenv`
  configuredBaseUrl: string | null; // AUTOBYTEUS_SERVER_HOST unless loopback, localhost or host.docker.internal
  tailscale: { address: string; dnsName: string | null } | null;
  vpnAddresses: string[];
  localNetwork: { networkId: string; addresses: string[]; allowed: boolean } | null;
};
```

The node reads only ordinary network facts: `os.networkInterfaces()`, one reverse DNS lookup per `100.64/10` tunnel address (1 s timeout), and the default route. It runs no Tailscale command and changes nothing. IPv4 only:

1. Excluded: internal, link-local `169.254/16`, public, and interfaces named `docker*`, `br-*`, `veth*`, `virbr*`, `vmnet*`, `vmenet*`, `vboxnet*`, `vnic*`, `lxcbr*`, `lxdbr*`, `incusbr*`, `cni*`, `flannel*`, `bridge*`, `awdl*`, `llw*`, `anpi*`; a `100.64/10` address with a hardware address (carrier-grade NAT).
2. Tailscale: a `100.64/10` address whose reverse name ends in `.ts.net` (the DNS name) or on a `tailscale*` interface.
3. VPN: a private address (`10/8`, `172.16/12`, `192.168/16`) on an interface without a hardware address.
4. Local network: a private address with a hardware address, plus unconfirmed `100.64/10` tunnel addresses; the default-route interface's address first.

The local network is recognised by its network ID: `gw_<first 16 hex of sha256>` of the router's hardware address (macOS `route -n get default` + `arp -n`; Linux `/proc/net/route` + `/proc/net/arp`), or `this-computer` when it cannot be read. `PUT /rest/remote-access/network/local-networks/:networkId` with `{ allowed: boolean }` remembers or forgets the owner's "Allow phones on this network" answer in `remote-access/allowed-local-networks.json` (`{ networkIds: string[] }`); another ID shape is refused with `REMOTE_ACCESS_NETWORK_ID_INVALID`.

A node in a container sees only container-internal addresses, so it reports no addresses: `tailscale: null`, `vpnAddresses: []`, `localNetwork: { networkId: "this-computer", addresses: [], allowed }`. For a Docker node on the desktop's computer, the desktop takes the facts of its own embedded node and the Docker node's published port.

The desktop (Nodes › Phone Setup) turns these facts and the node's port into the four ways to connect (`company_address`, `tailscale`, `vpn`, `local_network`), checks each address with `GET <address>/rest/remote-access/status` (same `nodeId`), and makes a code for the chosen way's first checked address. The node never decides the way.

## Pairing Model

1. The owner turns Phone Access on with `PUT /rest/remote-access/settings` (the desktop's "Show QR code" does it when it is off).
2. The owner creates a pairing session with `POST /rest/remote-access/pairing-sessions` `{ serverBaseUrl, serverName, connectionWay, trustedPrivateHttpAcknowledged }`. `connectionWay` is required (`REMOTE_ACCESS_PAIRING_WAY_INVALID` otherwise). The desktop sends one address it has checked to reach this node; `serverName` is the name the phone shows for the node (the desktop's own node: the computer's name; any other node: its name on the Nodes page).
3. The service normalizes the URL to the canonical server base. Reserved AutoByteus surfaces such as `/mobile`, `/rest`, `/graphql`, and `/ws` are stripped while deployment base paths are preserved.
4. Pairing sessions accept `https://` URLs and acknowledged trusted private `http://` URLs after normalization. Public HTTP and phone-unreachable local-only hosts are rejected.
5. The service creates a five-minute, single-use pairing code and returns `{ sessionId, payload, qrText, mobileUrl }`. `qrText` is a `/mobile?pairing=<payload>` URL; the payload is `{ version: 1, serverBaseUrl, pairingCode, expiresAt, serverName }`. `sessionId` (`pss_<32 hex>`) is opaque and never the code.
6. `DELETE /rest/remote-access/pairing-sessions/:sessionId` discards a code (204, also for an unknown ID): the desktop calls it when the code is closed, replaced or its tab changes. Turning Phone Access off discards every code.
7. The phone calls `POST /rest/remote-access/pairing-exchanges` with the pairing code and server base URL.
8. The backend creates a paired device record with the session's `connectionWay` and returns the only copy of the raw mobile credential to the phone. A second use of the code answers 401 `REMOTE_ACCESS_PAIRING_CONSUMED` until the code expires; an expired code answers 401 `REMOTE_ACCESS_PAIRING_EXPIRED` once, an unknown or discarded one 401 `REMOTE_ACCESS_PAIRING_INVALID` (a wrong code is refused like a wrong credential, NA-10).

Pairing sessions are in memory and short-lived. Paired devices persist under the app data directory in `remote-access/paired-devices.json`; only a SHA-256 credential hash is stored. Device summaries carry `connectionWay` (`null` for phones paired before devices recorded it).

## Mobile Credential Enforcement

Remote Access mobile credentials use the `mra_...` prefix. HTTP REST and GraphQL use `Authorization: Bearer <mra_...>`. Browser WebSocket clients pass the same credential as `access_token=<mra_...>` because browser WebSocket constructors cannot send arbitrary authorization headers.

The gate accepts a phone credential (`phone-credential-verifier.ts`) only when:

- the credential has the `mra_` prefix;
- the credential hash matches a paired device record (the records are kept in memory; no file is read per request);
- the device is not revoked (403 `REMOTE_ACCESS_DEVICE_REVOKED`);
- Phone Access is currently enabled (403 `PHONE_ACCESS_DISABLED`);
- the route permits phones (otherwise 403 `NODE_ROUTE_NOT_PERMITTED`, or `PHONE_ACCESS_ROUTE_REFUSED` on a WebSocket).

An accepted request's client identity is `{ kind: "phone", deviceId }`. Last-seen timestamps are updated at most once a minute per phone, in the background, and never reject a valid request. Revoking a phone or turning Phone Access off closes the phone's open sockets at once with 4403 and the code.

Phone credentials do not open owner actions: paired phones cannot create pairing sessions, change Phone Access settings, list devices or revoke devices.

Credential-bearing URLs, pairing payloads, mobile credentials, and authorization headers must be redacted before logging or diagnostic output.

Every refusal is logged once at warn level: `Node request refused <code> <redacted url> from <client address>` (`request-refusal.ts`), for HTTP replies, `/graphql` upgrades, the peer WebSocket and `/ws/*` closes, followed by `origin <value>` for `REMOTE_ACCESS_ORIGIN_REFUSED` and by `host <name> (add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)` for `REMOTE_ACCESS_HOST_REFUSED` (both values escaped and cut at 100 characters). No other header and no credential, code or secret is logged.

## Server Instance Identity

`GET /rest/remote-access/status` returns `{ phoneAccessEnabled, pairingAvailable, nodeId }`. The node ID is persisted under the app data directory and is used by the desktop Phone Setup panel to prove that every address it puts in a QR reaches the same node before a code is made. The status carries no name: a node has no name of its own; the phone takes it from the QR.

Display names, hostnames, and user-entered URLs are not node identity.

## Client-facing URL Resolution

Absolute URLs returned to clients should go through `DefaultClientFacingUrlResolver` when they may be consumed from a phone.

Resolution preference is:

1. the requesting phone's paired-device client base URL;
2. configured external/public base URL;
3. local fallback base URL only for loopback clients or when it is not loopback.

If the request is remote and the only fallback is loopback, the resolver returns a relative REST path instead of leaking an unusable `127.0.0.1` URL.

This is not host-header discovery. The remote client-facing base URL is selected during pairing or by explicit configuration, then reused from the paired device.

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

Disabling Phone Access does not delete paired-device records. Revoking a device marks its `revokedAt` timestamp and retains the record for history and revoked-credential diagnostics. `GET /rest/remote-access/devices` returns active devices only; the owner can read retained revoked rows through `GET /rest/remote-access/devices/revoked`. While disabled, new pairing sessions are rejected and existing mobile credentials fail with `PHONE_ACCESS_DISABLED`.

## Validation Coverage

Validation for this feature should cover:

- mobile static build and backend serving under `/mobile`;
- backend-generated `/mobile?pairing=...` bootstrapping into the phone shell;
- pairing exchange, persisted mobile session reload, and mobile deep links;
- refusal of every non-exempt REST, GraphQL and WebSocket request without a credential, and network admission (`tests/e2e/node-access/node-access-model.e2e.test.ts`);
- refusal of requests addressed to a name that is not the node's on every entry form, and acceptance of each allowed-host class and setting;
- refusal of non-allowed Origins, localhost pages included, on every WebSocket route family and on HTTP, and acceptance of each allowed-origin class;
- the user-file headers on every user-file route;
- mobile `mra_...` authorization for protected REST/GraphQL routes and phone WebSocket routes, and its refusal on the other WebSocket routes;
- rejection of mobile credentials on owner-management routes;
- paired-device revoke and revoke-all invalidation, including active-list vs revoked-history separation;
- Phone Access enabled state and credential usability after backend restart against the same app data;
- seeded agent/team visibility through paired mobile GraphQL/routes;
- Docker image packaging of the `/mobile` web shell for public launcher, remote-server, and all-in-one image paths;
- status `nodeId` use for phone-facing advertised URL verification.

## Phase Two Boundary

Phone Access pairs phones over private-network URLs; since autobyteus-437 every request needs a credential and owner actions need the owner's (see Route Permissions). For WebSockets, Phase Two's route limit is done: a phone credential opens only the phone WebSocket routes. Least-privilege phone authorization inside the reachable endpoints (folders, `createWorkspace`, settings), phone credential rotation and native secure credential storage are not done; they are tracked in `../../../docs/future-tickets/mobile-backend-authorization-hardening.md`.
