# Implementation Plan

## Stage

- Stage: `Ready for execution`
- Scope: `Small`

## Tasks

1. Add LM Studio helper logic in server team-history e2e file.
2. Add one env-gated, no-mock real-provider terminate/continue recall test.
3. Keep existing mocked tests unchanged.
4. Run e2e suite without LM Studio env to verify baseline pass/skip behavior.
5. Run e2e suite with LM Studio env to verify real-provider pass.
6. Sync ticket artifacts.
