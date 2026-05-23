# Remote Access / Phone Access Backend

Remote Access is the backend boundary that lets a phone/PWA connect to a user-owned AutoByteus node over a reachable private network URL without exposing the general API to unauthenticated network peers. Embedded desktop-node management still uses loopback owner trust. Remote Docker node Phone Access management uses an explicit launcher-generated node-admin claim instead of broadening loopback trust to Docker bridge, LAN, or VPN peers.

## Runtime Ownership

| Concern | Owner |
| --- | --- |
| HTTP route classification and authorization | `src/api/security/remote-access-route-policy.ts` |
| Fastify request hook | `src/api/security/remote-access-policy-plugin.ts` |
| WebSocket mobile credential checks | `src/api/websocket/remote-access-websocket-auth.ts` |
| Phone Access settings | `src/remote-access/services/remote-access-settings-service.ts` and `stores/remote-access-settings-store.ts` |
| Pairing session creation/exchange | `src/remote-access/services/remote-access-pairing-service.ts` |
| Paired device credentials and revocation | `src/remote-access/services/paired-device-service.ts` and `stores/paired-device-store.ts` |
| Remote Docker node owner claim validation | `src/remote-access/services/remote-node-admin-service.ts` |
| Stable server instance identity | `src/remote-access/services/server-instance-identity-service.ts` |
| Client-facing absolute/relative resource URLs | `src/remote-access/services/client-facing-url-resolver.ts` |
| Mobile static asset serving | `src/api/static/mobile-web.ts` |
| Sensitive URL redaction | `src/api/security/redact-sensitive-url.ts` |

## Public, Local-only, and Mobile-authorized Routes

The route policy classifies every HTTP request before normal route handling:

- Public bootstrap/static routes:
  - `OPTIONS` preflight
  - `/mobile` and `/mobile/*`
  - `/rest/health`
  - `GET /rest/remote-access/status`
  - `POST /rest/remote-access/pairing-exchanges`
- Phone Access owner routes:
  - `GET /rest/remote-access/settings`
  - `PUT /rest/remote-access/settings`
  - `GET /rest/remote-access/address-candidates`
  - `POST /rest/remote-access/pairing-sessions`
  - `GET /rest/remote-access/devices` for active paired-device summaries
  - `GET /rest/remote-access/devices/revoked` for revoked/history summaries
  - `DELETE /rest/remote-access/devices/:deviceId`
  - `DELETE /rest/remote-access/devices`
- Local-or-mobile protected routes:
  - `POST /graphql`
  - `/ws/*` and GraphQL WebSocket upgrades
  - protected REST families such as media, files, uploads, workspaces, context files, drafts, runs, team runs, run file changes, team communication, application backend routes, and application bundle assets
- External-signature routes:
  - managed external-channel ingress paths remain governed by their signature contract instead of Phone Access credentials.

Loopback peers are treated as local desktop access for Phone Access owner routes and protected routes. Non-loopback peers need either a valid node-admin claim for Phone Access owner routes or a valid paired mobile credential for mobile-authorized routes unless the route is explicitly public.

`PHONE_ACCESS_OWNER` is intentionally narrow. It covers settings, address candidates, pairing-session creation, active/revoked paired-device listing, and revocation for the target node. A node-admin claim does not authorize GraphQL, files, terminal, runs, packages, settings outside Phone Access, browser bridge routes, or other default-protected REST routes.

## Remote Docker Node Owner Claims

Mobile-safe Docker launcher scripts generate a random claim ID and raw secret at container creation. The container receives only:

- `AUTOBYTEUS_NODE_ADMIN_CLAIM_ID`
- `AUTOBYTEUS_NODE_ADMIN_CLAIM_HASH`
- `AUTOBYTEUS_NODE_ADMIN_CLAIM_SCOPE=phone-access-management`

The raw secret stays in launcher/Electron owner-side state. Remote Docker node windows attach the claim only to Phone Access owner-route requests with:

- `X-Autobyteus-Node-Admin-Claim-Id`
- `X-Autobyteus-Node-Admin-Claim`

`RemoteNodeAdminService` hashes the presented raw secret and compares it to the configured hash with timing-safe comparison. Missing, wrong, unconfigured, or wrong-scope claims reject the request. Claim rotation is launcher-owned: rotating or recreating a mobile-safe node changes the server-side hash and requires the desktop owner to register the new claim.

Claim headers and common query/body key variants are redacted by the sensitive URL/logging redaction helpers. Do not put the raw claim in server persistence, container environment, renderer `localStorage`, normal node snapshots, URLs, logs, or diagnostic artifacts.

## Server Instance Identity

`GET /rest/remote-access/status` returns a stable `serverInstanceId` in addition to Phone Access availability metadata. The identity is persisted under the app data directory and is used by the desktop Phone Access UI to prove that a manually entered Android-facing HTTPS URL reaches the same Docker node as the desktop management URL before a QR is created.

Display names, hostnames, and user-entered URLs are not node identity. Remote Docker QR creation should fail when the management URL and advertised Android URL cannot both return matching `serverInstanceId` values.

## Pairing Model

1. The owner enables Phone Access with `PUT /rest/remote-access/settings`. Embedded desktop windows use loopback owner trust; remote Docker node windows must present a valid node-admin claim.
2. The owner creates a pairing session with `POST /rest/remote-access/pairing-sessions` and a selected client-facing `serverBaseUrl`. Embedded windows can use the verified desktop-facing URL. Remote Docker windows require a manually entered Android-facing HTTPS URL whose status identity matches the management target.
3. The service normalizes the selected URL to the canonical server base. Reserved AutoByteus surfaces such as `/mobile`, `/rest`, `/graphql`, and `/ws` are stripped while deployment base paths are preserved.
4. New desktop-created pairing sessions require `https://` after normalization.
5. The service creates a five-minute, single-use pairing code and returns a `/mobile?pairing=<payload>` URL suitable for a QR code or copy/paste. The pairing payload stores the canonical server base, while the returned mobile URL appends `/mobile` for the user-facing shell.
6. The phone calls `POST /rest/remote-access/pairing-exchanges` with the pairing code and server base URL.
7. The backend creates a paired device record and returns the only copy of the raw credential to the phone.

Pairing sessions are in-memory, short-lived, and consumed during exchange. Paired devices persist under the app data directory in `remote-access/paired-devices.json`; only a SHA-256 credential hash is stored.

## Mobile Credential Enforcement

Mobile REST and GraphQL use `Authorization: Bearer <credential>`. Mobile WebSocket clients pass the same credential as `access_token=<credential>` because browser WebSocket constructors cannot send arbitrary authorization headers.

A valid mobile credential is accepted only when:

- the credential hash matches a paired device record;
- the device is not revoked;
- Phone Access is currently enabled.

Accepted mobile requests get an auth context with `mode: "mobile"`, the paired `deviceId`, and the stored `clientFacingBaseUrl`. Last-seen timestamps are updated best-effort and must not reject otherwise valid requests.

Credential-bearing URLs, pairing payloads, and node-admin claim values must be redacted before logging or diagnostic output.

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


## Desktop Route Boundary

Remote Access static serving is limited to `/mobile` and `/mobile/*`. Normal desktop web routes such as `/workspace` remain owned by the desktop/web shell and must not render the mobile shell. A stale phone deep link such as `/mobile/workspace` is handled by the mobile SPA as an unsupported desktop-workspace notice, preserving the desktop route behavior for regular browser and Electron users.

## Persistence and Disable Behavior

Remote Access data lives under the app data directory:

- `remote-access/settings.json` stores `phoneAccessEnabled` and update metadata.
- `remote-access/paired-devices.json` stores device id, display name, credential hash, client-facing base URL, created/last-seen/revoked timestamps.
- `remote-access/server-instance.json` stores the stable `serverInstanceId` used for same-node advertised URL verification.

Disabling Phone Access does not delete paired-device records. Revoking a device marks its `revokedAt` timestamp and retains the record for history and revoked-credential diagnostics. `GET /rest/remote-access/devices` returns active devices only; local desktop management can read retained revoked rows through `GET /rest/remote-access/devices/revoked`. While disabled, new pairing sessions are rejected and existing non-loopback mobile credentials fail with `PHONE_ACCESS_DISABLED`.

## Validation Coverage

The delivery validation for this feature covered:

- mobile static build and backend serving under `/mobile`;
- backend-generated `/mobile?pairing=...` bootstrapping into the phone shell;
- pairing exchange, persisted mobile session reload, and mobile deep links;
- REST, GraphQL, WebSocket, and protected resource auth rejection/acceptance over a LAN/private base;
- per-device revoke and revoke-all invalidation, including active-list vs revoked-history separation;
- Phone Access enabled state and credential usability after backend restart against the same app data;
- seeded agent/team visibility through paired mobile GraphQL/routes;
- node-admin claim authorization for remote Docker Phone Access owner routes without granting general API authority;
- status `serverInstanceId` use for Android-facing advertised URL verification.

## Phase Two Boundary

Phase One moves the recommended Android path to a mobile-safe Docker node and narrows Docker-node Phone Access management to explicit owner claims. It does not complete least-privilege mobile backend authorization, token rotation, native secure credential storage, or backend hard denial of every high-risk operation. Those items are tracked in `../../../docs/future-tickets/mobile-backend-authorization-hardening.md` from this feature doc.
