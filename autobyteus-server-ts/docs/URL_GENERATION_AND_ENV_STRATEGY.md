# URL Generation and Environment Strategy (TypeScript)

## Goal

The server must generate absolute URLs that are valid from the client environment.

Examples:

- Media file URLs returned by REST/GraphQL.
- Download URLs embedded in tool responses.
- Any persisted URL later consumed by frontend clients.

## Source of Truth

`AUTOBYTEUS_SERVER_HOST` is the single source of truth for server public URL.

In TS this is validated and normalized in `src/config/app-config.ts` during `initializeBaseUrl()`.

## Ownership Model

The caller that launches the server must provide the correct host value:

- Electron launcher sets host and port dynamically.
- Local dev uses `.env` or CLI environment.
- Containerized deployments set explicit value in runtime config.

## Why Not Dynamic Host Discovery

Host-header-based discovery is fragile in proxied/containerized networks.

The TS server uses explicit startup configuration instead of implicit request-time detection.

## Data Directory Interaction

`--data-dir` can move the `.env` location.

Because `.env` and runtime paths are coupled, `setCustomAppDataDir()` must execute before `AppConfig.initialize()`.

## Practical Rules

1. Always set `AUTOBYTEUS_SERVER_HOST` in the launching environment.
2. If using `--data-dir`, ensure the target directory contains `.env`.
3. Do not instantiate path-sensitive singleton services before config initialization.
