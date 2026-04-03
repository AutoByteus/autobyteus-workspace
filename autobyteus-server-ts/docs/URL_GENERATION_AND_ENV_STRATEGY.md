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

## Public URL vs Internal Runtime URL

The server now uses two different URL concepts on purpose:

- Public URL:
  - Driven by `AUTOBYTEUS_SERVER_HOST`.
  - Used for Electron clients, remote-node registration, media URLs, and any absolute URL returned to external clients.
- Internal runtime URL:
  - Driven by the runtime-only `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`.
  - Seeded from the actual bound listen host/port after server startup in `src/server-runtime.ts`.
  - Used only by colocated managed runtimes such as the managed messaging gateway.

The internal runtime URL is intentionally not persisted to `.env` and is not user-configured.

## Ownership Model

The caller that launches the server must provide the correct host value:

- Electron launcher provides the stable embedded loopback public URL.
- Local dev uses `.env` or CLI environment.
- Containerized deployments set explicit value in runtime config.

Server startup then derives the colocated internal runtime URL automatically from the bound listen address for managed child-process callbacks.

## Why Not Dynamic Host Discovery

Host-header-based discovery is fragile in proxied/containerized networks.

The TS server uses explicit startup configuration instead of implicit request-time detection.

## Data Directory Interaction

`--data-dir` can move the `.env` location.

Because `.env` and runtime paths are coupled, bootstrap must call `appConfigProvider.initialize({ appDataDir })` before `AppConfig.initialize()`, and it must do that before importing `src/server-runtime.ts`.

## Practical Rules

1. Always set `AUTOBYTEUS_SERVER_HOST` in the launching environment for public client access.
2. Do not point managed messaging callback traffic at `AUTOBYTEUS_SERVER_HOST`; colocated managed runtimes must use the runtime-only internal URL instead.
3. If using `--data-dir`, ensure the target directory contains `.env`.
4. Do not instantiate path-sensitive singleton services before config initialization.
5. If a test or harness bypasses `src/app.ts` and imports `src/server-runtime.ts` directly, it must initialize config first and seed `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` explicitly before enabling managed messaging.
