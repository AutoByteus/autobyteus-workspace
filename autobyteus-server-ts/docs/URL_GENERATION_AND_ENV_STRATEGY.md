# URL Generation and Environment Strategy (TypeScript)

## Goal

The server must generate absolute URLs that are valid from the client environment.

Examples:

- Media file URLs returned by REST/GraphQL.
- Download URLs embedded in tool responses.
- Any persisted URL later consumed by frontend clients.

## Source of Truth

`AUTOBYTEUS_SERVER_HOST` is the source of truth for the server public URL.

In TS this is validated and normalized in `src/config/app-config.ts` during `initializeBaseUrl()`.

## Public URL

The public URL is driven by `AUTOBYTEUS_SERVER_HOST`. It is used for Electron
clients, remote-node registration, media URLs, and any absolute URL returned to
external clients.

## Ownership Model

The caller that launches the server must provide the correct host value:

- Electron launcher provides the stable embedded loopback public URL.
- Local dev uses `.env` or CLI environment.
- Containerized deployments set explicit value in runtime config.

## Why Not Dynamic Host Discovery

Host-header-based discovery is fragile in proxied/containerized networks.

The TS server uses explicit startup configuration instead of implicit request-time detection.

Remote Access adds one explicit exception for phone clients: when a paired mobile credential is authorized, the request auth context carries the client-facing base URL selected at pairing time. Resource URL generation may use that paired base URL, or an explicitly supplied/configured external base URL, before falling back to the local server base. This is still explicit configuration, not host-header discovery.

Memory Sync / Memory Hub uses the same explicit-URL principle. A hub stores a user-confirmed `advertisedHubBaseUrl` for source-node ingestion setup. Candidate URLs may be seeded from `AUTOBYTEUS_SERVER_HOST`, the current node URL, Docker host aliases, LAN/tailnet-like interfaces, or manual input, but the chosen advertised URL must be validated from the source node with **Test connection**. Do not assume a loopback or bind address is reachable from Docker containers, Kubernetes pods, or another network.

## Remote Access Client-Facing URLs

Phone Access must not return loopback-only absolute URLs to a phone on a LAN/VPN/private network. Use `DefaultClientFacingUrlResolver` for REST resource URLs that may be consumed by paired mobile clients.

Resolution order:

1. the active mobile auth context's paired `clientFacingBaseUrl`;
2. an explicitly supplied paired-device client base URL;
3. a configured external/public base URL;
4. the local fallback base URL only for loopback peers or when it is not itself loopback.

When the requester is remote and the only known fallback is loopback, the resolver returns a relative REST path rather than an unusable `127.0.0.1` absolute URL.

## Data Directory Interaction

`--data-dir` can move the `.env` location.

Because `.env` and runtime paths are coupled, bootstrap must call `appConfigProvider.initialize({ appDataDir })` before `AppConfig.initialize()`, and it must do that before importing `src/server-runtime.ts`.

## Practical Rules

1. Always set `AUTOBYTEUS_SERVER_HOST` in the launching environment for public client access.
2. If using `--data-dir`, ensure the target directory contains `.env`.
3. Do not instantiate path-sensitive singleton services before config initialization.
4. If a test or harness bypasses `src/app.ts` and imports `src/server-runtime.ts` directly, it must initialize config first.
5. For Remote Access/mobile-facing resource URLs, use the client-facing resolver instead of directly concatenating `AUTOBYTEUS_SERVER_HOST`; paired phones should receive the paired private-network base or a safe relative path, not a desktop loopback URL.
6. For Memory Hub ingestion, persist the user-confirmed advertised hub base URL and require the source-side Test Connection path before relying on it for Docker/Kubernetes/LAN sync.
