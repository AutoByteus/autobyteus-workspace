# Proposed Design

## Version

`v1`

## Scope

Codex team continuation persistence correctness for refreshed member runtime references.

## Problem Summary

Continuation restores Codex member sessions and may produce refreshed runtime references (new `threadId`), but persistence layer keeps old manifest references. Projection then reads stale thread IDs for affected members (observed on student).

## Design Changes

- `C-001` Add a focused team-history API to persist updated team manifest/member manifests without resetting unrelated history summary semantics.
- `C-002` Update Codex continuation flow to persist restored member bindings before routing resumed user turn.
- `C-003` Add unit regression coverage ensuring refreshed student thread ID is persisted and surfaced through resume-config/manifests.

## Boundaries

- No frontend changes.
- No protocol/schema changes.
- No runtime behavior changes for autobyteus-team path.

## Risk

- Low-to-medium: persistence timing/order in continuation path.
- Mitigation: unit tests for both continuation service and history service persistence behavior.
