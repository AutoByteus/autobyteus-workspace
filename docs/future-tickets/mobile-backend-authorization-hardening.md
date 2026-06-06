# Future Ticket: Mobile Backend Authorization And Token/Session Hardening

## Status

Future / Phase Two. Split from Phase One Android/Phone Access pairing over trusted private-network node URLs.

Phase One focuses on pairing Android/phone clients with the intended AutoByteus node over a trusted private-network URL, preferring HTTPS and allowing acknowledged trusted private HTTP for LAN/tailnet use, while keeping desktop management access on the trusted private-network product model.

Phase Two must harden what a mobile session can do **after** pairing. Runtime isolation can reduce blast radius, but it does not replace backend authorization, token/session safety, or credential custody.

## Phase Two Goal

Make mobile sessions least-privilege, revocable, expiring, node-bound, and backend-enforced.

A stolen mobile credential/session must not be enough to:

- call admin GraphQL APIs,
- configure LLM provider API keys,
- enable dangerous tools,
- manage skills/packages/MCP servers,
- access terminal endpoints,
- mutate arbitrary files,
- create arbitrary workspaces,
- register remote browser bridges,
- keep indefinite access after revocation or expiry.

## Why This Is Not In Phase One

Token/session hardening touches many surfaces:

- `autobyteus-server-ts/src/remote-access/domain/models.ts`
- `remote-access/services/remote-access-auth-service.ts`
- `remote-access/services/paired-device-service.ts`
- remote-access stores
- `api/security/remote-access-route-policy.ts`
- GraphQL schema/resolver authorization
- REST route authorization
- WebSocket auth
- `autobyteus-web` mobile credential/session storage
- Android secure storage / native bridge
- revoke/session UI and tests

Putting all of that into Phase One would delay the primary first milestone: Android/phone pairing with a trusted private-network node URL.

## In-Scope Use Cases

- UC-P2-001: A default mobile session can use only phone-appropriate mobile features.
- UC-P2-002: A default mobile session cannot call admin/backend configuration operations.
- UC-P2-003: A stolen access token has limited lifetime.
- UC-P2-004: A stolen/reused refresh token can be detected and revoked.
- UC-P2-005: A mobile session is bound to one node and cannot silently switch to host/embedded node authority.
- UC-P2-006: Mobile terminal is denied at backend even if someone calls the WebSocket endpoint directly.
- UC-P2-007: Mobile file access is read-only and limited to permitted run artifacts/workspace files.
- UC-P2-008: Owner can revoke a mobile device/session and future REST/GraphQL/WebSocket calls fail.
- UC-P2-009: Android native app stores durable session material securely instead of relying on WebView `localStorage`.

## Out Of Scope

- Replacing the whole agent runtime sandbox.
- Enterprise SSO/IdP integration.
- Making Docker a perfect sandbox.
- Re-introducing mobile terminal as a standard mobile feature.

## Functional Requirements

### Authorization / Capability Requirements

- R-P2-AUTH-001: Add a central backend authorization owner for mobile sessions. Route-level checks alone must not be the final security boundary.
- R-P2-AUTH-002: Mobile sessions must carry explicit capabilities/scopes, not broad backend authority.
- R-P2-AUTH-003: Default mobile sessions must not have admin/settings/API-key/package/skill/MCP/migration/browser-bridge capabilities.
- R-P2-AUTH-004: GraphQL operations must be classified by required capability before resolver side effects occur.
- R-P2-AUTH-005: REST routes used by mobile must be classified by required capability/resource.
- R-P2-AUTH-006: WebSocket routes must be classified by required capability/resource.
- R-P2-AUTH-007: Terminal WebSocket routes must reject mobile auth contexts by default, regardless of UI visibility.
- R-P2-AUTH-008: File mutation operations must reject standard mobile auth contexts: write/delete/move/rename/create.
- R-P2-AUTH-009: Mobile file viewing must be read-only and limited to allowed run artifacts or allowed workspace files.
- R-P2-AUTH-010: Arbitrary `createWorkspace(rootPath)` must be denied for standard mobile auth contexts.
- R-P2-AUTH-011: Remote browser bridge registration/clearing must require admin/browser-bridge authority and must not be available to default mobile sessions.
- R-P2-AUTH-012: Tool approval from mobile must be either denied by default or limited to explicitly safe/reviewable actions.

### Token / Session Hardening Requirements

- R-P2-SESSION-001: Replace broad long-lived mobile bearer credentials with explicit mobile session records.
- R-P2-SESSION-002: Each mobile session must be bound to one node identity/base URL and node kind (`docker` or `embedded-host` if supported).
- R-P2-SESSION-003: Each mobile session must include device ID, session ID, node binding, granted capabilities, created time, last seen time, expiry time, and revoked state.
- R-P2-SESSION-004: Use short-lived access tokens for normal REST/GraphQL calls.
- R-P2-SESSION-005: Use refresh-token rotation or equivalent replay-resistant renewal.
- R-P2-SESSION-006: Store only token hashes/server-side secrets on the server, not raw refresh tokens.
- R-P2-SESSION-007: Detect refresh token reuse where possible and revoke the token family/session.
- R-P2-SESSION-008: Add idle timeout and absolute session lifetime.
- R-P2-SESSION-009: Revoking a device/session must invalidate future access-token refresh and future request authorization.
- R-P2-SESSION-010: Existing legacy `mra_...` broad mobile credentials should be invalidated or force re-pair during migration; do not keep a broad compatibility path.

### WebSocket Token Requirements

- R-P2-WS-001: Durable session/refresh secrets must not be placed in WebSocket query strings.
- R-P2-WS-002: Mobile WebSocket connections should use short-lived route-bound WebSocket tokens.
- R-P2-WS-003: WebSocket tokens must include route/resource binding, such as route type and workspace/run ID where relevant.
- R-P2-WS-004: WebSocket tokens must expire quickly and be one-time-use where practical.
- R-P2-WS-005: Revocation should close active WebSockets or prevent continued use within a documented enforcement window.

### Android / Client Credential Custody Requirements

- R-P2-ANDROID-001: Android durable session/refresh material must be stored in native protected storage, not raw WebView `localStorage`.
- R-P2-ANDROID-002: The Android WebView should receive only short-lived access tokens or authorized request mediation from a native token broker.
- R-P2-ANDROID-003: If pure PWA/mobile browser support remains, it must be treated as lower trust with shorter sessions and reduced capabilities.
- R-P2-ANDROID-004: Android release builds must not persist/use mobile sessions over cleartext HTTP unless the user explicitly acknowledges a trusted private LAN/tailnet path or enables a development-only mode.
- R-P2-ANDROID-005: Android local unpair should delete local secure material and attempt server-side session revoke when online.

### Audit / Revocation Requirements

- R-P2-AUDIT-001: Owner UI should show paired mobile sessions/devices with node, capabilities, created time, last seen time, expiry, and revoked state.
- R-P2-AUDIT-002: Owner can revoke one device/session or all mobile sessions for a node.
- R-P2-AUDIT-003: Security-sensitive events should be recorded: pair, refresh reuse detected, revoke, denied admin operation, denied terminal, denied file mutation.
- R-P2-AUDIT-004: Logs must redact pairing codes, access tokens, refresh tokens, WebSocket tokens, mobile credentials, and authorization headers.

## Acceptance Criteria

- AC-P2-001: A default mobile session cannot call representative admin GraphQL mutations such as server settings updates, LLM API key updates, MCP server configuration, app-data migrations, package/skill management, or remote-browser-bridge registration.
- AC-P2-002: A direct mobile call to `/ws/terminal/...` is rejected by the backend.
- AC-P2-003: Mobile file write/delete/move/rename/create mutations are rejected by the backend.
- AC-P2-004: Allowed read-only mobile file/artifact viewing still works.
- AC-P2-005: A mobile session paired to a Docker node cannot use its session material against the embedded host node.
- AC-P2-006: Access tokens expire and require renewal.
- AC-P2-007: Refresh-token rotation produces a new refresh token and invalidates the previous refresh token.
- AC-P2-008: Reuse of an old refresh token revokes or locks the session/token family.
- AC-P2-009: Revoked mobile sessions fail REST, GraphQL, and WebSocket authorization.
- AC-P2-010: Android no longer stores durable raw mobile session credentials in WebView/localStorage for the native wrapper.
- AC-P2-011: Logs and diagnostics redact all token and credential names.

## Candidate Implementation Areas

### Backend

- `autobyteus-server-ts/src/remote-access/domain/models.ts`
  - split or extend domain types for session records, node binding, capabilities, token summaries.
- `autobyteus-server-ts/src/remote-access/domain/capabilities.ts`
  - add explicit mobile capability enum/catalog.
- `autobyteus-server-ts/src/remote-access/services/remote-access-session-service.ts`
  - new session/token family owner.
- `autobyteus-server-ts/src/remote-access/services/remote-access-authorization-service.ts`
  - central capability/resource authorization owner.
- `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts`
  - authenticate short-lived tokens and return scoped context.
- `autobyteus-server-ts/src/remote-access/stores/*`
  - add session/token/audit persistence.
- `autobyteus-server-ts/src/api/graphql/schema.ts`
  - add auth checker or equivalent operation guard.
- `autobyteus-server-ts/src/api/graphql/types/*`
  - annotate/classify operations by required mobile capability.
- `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts`
  - validate route-bound short-lived WebSocket tokens.
- `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts`
  - extend redaction keys.

### Web / Electron

- `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts`
  - remove durable secret storage; keep only non-secret session summary if needed.
- `autobyteus-web/utils/remoteAccess/authorizedTransport.ts`
  - use token broker/access token flow.
- `autobyteus-web/utils/remoteAccess/websocketAuth.ts`
  - request short-lived WS tokens.
- `autobyteus-web/stores/mobileNodeSessionStore.ts`
  - store node-bound session summary and refresh state via broker.
- Phone Access owner UI/store
  - show session capabilities, expiry, revocation.

### Android

- Add native secure session store.
- Add native token broker / JS bridge with minimal API.
- Keep refresh token inaccessible to JavaScript.
- Enforce production HTTPS policy for persisted mobile sessions.

## Testing Requirements

- Unit tests for session creation/refresh/rotation/revocation.
- Unit tests for GraphQL operation classification coverage: fail if a mutation is unclassified.
- E2E tests for denied admin mutations from default mobile session.
- E2E tests for denied terminal WebSocket from mobile session.
- E2E tests for denied file mutations and allowed read-only file viewing.
- E2E tests for token expiry/refresh/revocation.
- Android tests or manual evidence for secure storage / no durable WebView localStorage secret.

## Relationship To Phase One

Phase One is a prerequisite/recommended foundation but not a substitute.

- Phase One reduces runtime blast radius by moving mobile work into Docker.
- Phase Two reduces API/credential blast radius by making mobile sessions least-privilege, expiring, and revocable.

Both are needed for the long-term maximum-security mobile-control solution.
