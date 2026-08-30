# Release Notes — Logical Application-Agent Addressing

## What's New

- Applications now target their bound root Agent or a configured Team member with one stable logical address instead of exposing physical run identifiers.
- Root selection remains simple, while nested Team members use canonical rooted member addresses that stay meaningful across launch, restart, and recovery.

## Improvements

- Application binding and execution-producer payloads now contain only the fields their public contracts need, removing redundant role/runtime-kind data.
- Address authorization is resolved once at the application boundary, giving input and streaming one consistent, authorized runtime target.
- Application work remains correlated until its actual result or error, so legitimate long-running work no longer fails only because it exceeded the former 30-second response deadline.
- Lifecycle-control failures now stop and await the worker before reporting failure, avoiding work that silently continues after callers receive an error.

## Compatibility And Data

- No database migration or destructive reset is required.
- Existing binding summaries, event journals, and run metadata remain directly readable through the current-schema projections; the physical SQLite schema is unchanged.

## Validation

- Real standalone and Studio Socratic and Brief journeys passed, including publication, named Writer handoff, projection, restart, recovery, remount, route separation, and package parity.
- A cold Brief standalone request completed successfully after 64,394 ms, directly proving that accepted work can outlive the former deadline.
- Source review passed at 97%, API/E2E passed at 98% with every applicable category at least 97%, and the final macOS arm64 Electron candidate passed package and five-scenario isolation verification before release.
