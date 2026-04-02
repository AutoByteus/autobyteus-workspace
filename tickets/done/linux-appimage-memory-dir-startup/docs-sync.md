# Docs Sync

- Ticket: `linux-appimage-memory-dir-startup`
- Last Updated: `2026-04-02`

## Decision

- `Updated`

## Rationale

- Startup architecture is now more explicit:
  - `src/app.ts` is the bootstrap boundary,
  - `src/server-runtime.ts` owns the broader runtime graph,
  - config bootstrap now happens before runtime import.
- Existing docs referenced startup responsibility too loosely and still pointed some runtime behavior at `src/app.ts`.

## Updated Documents

- `autobyteus-server-ts/docs/README.md`
- `autobyteus-server-ts/docs/ARCHITECTURE.md`
- `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md`
- `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`

## Local-Fix Follow-Up

- `No additional docs change required`
- Rationale: the proxy-export cleanup tightened the implementation and public export surface, but it did not change the documented bootstrap/runtime ownership model that was already updated in the prior round.

## Repeat Review Follow-Up

- `No additional docs change required`
- Rationale: the repeat deep review found no new design or boundary issue that changed the documented architecture.
