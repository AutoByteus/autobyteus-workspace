# Requirements

## Metadata

- Ticket: `message-gateway-quality-review`
- Status: `Refined`
- Owner: `Codex`
- Branch: `codex/message-gateway-quality-review`
- Last Updated: `2026-03-24`
- Scope Triage: `Medium`

## Refined Problem Statement

The fresh full-project review found that `src/bootstrap/create-gateway-app.ts` overloads bootstrap ownership. It mixes app construction, adapter/service assembly, worker and lock setup, startup sequencing, shutdown sequencing, and route registration in one function. More importantly, the startup path has no explicit rollback owner when supervised provider startup fails after queue locks and workers have already been started. The active slice must make bootstrap lifecycle ownership clearer and guarantee cleanup on partial-startup failure.

## Review Decision

- The active slice is now `Medium` scope.
- The refactor target is bootstrap lifecycle ownership in `create-gateway-app`.
- The previous route-boundary slice remains complete; this cycle addresses the next higher-value issue from the full-project review.

## Goal

Make gateway bootstrap startup and shutdown easier to reason about by giving partial-startup rollback a clear owner, while preserving existing behavior and adding focused coverage for startup-failure cleanup.

## In Scope

- `src/bootstrap/create-gateway-app.ts`
- Small support helpers or bootstrap-local files needed to separate startup/shutdown support structure from the main bootstrap spine
- Focused tests for startup-failure cleanup behavior
- Design-principle review and code-review documentation for this slice

## Out Of Scope

- Broad redesign of all provider adapters
- Rewriting the gateway runtime model
- Unrelated monorepo packages
- Repository finalization, merge, or archival without explicit user verification

## Primary Use Cases

1. Gateway bootstrap succeeds and all owned runtime resources start normally.
2. Gateway bootstrap fails while acquiring queue locks.
3. Gateway bootstrap fails after queue locks and workers have started, but before startup finishes because a supervised provider fails to start.
4. Gateway shutdown closes all owned runtime resources cleanly.

## Functional Requirements

- `FR-001`: The bootstrap lifecycle must have an explicit rollback path when startup fails after partial success.
- `FR-002`: If supervised provider startup fails during `onReady`, the gateway must stop already-started workers and release acquired queue locks before surfacing the startup failure.
- `FR-003`: The bootstrap code must make startup and shutdown ownership explicit instead of interleaving lifecycle support branches throughout one large function.
- `FR-004`: Existing successful startup behavior, route registration, and normal shutdown behavior must remain intact.
- `FR-005`: Focused tests must explicitly cover startup rollback after a provider-start failure, not only lock-acquire failure and close-path cleanup.

## Non-Functional Requirements

- `NFR-001`: The refactor must improve data-flow spine clarity in bootstrap.
- `NFR-002`: Support helpers must serve the bootstrap owner directly and must not become empty indirection.
- `NFR-003`: Startup and shutdown logic should become easier to review by separating the lifecycle support structure from adapter/service assembly.

## Acceptance Criteria

- `AC-001`: When supervised provider startup fails during `onReady`, already-started workers are stopped before the startup failure is returned.
- `AC-002`: When supervised provider startup fails during `onReady`, acquired queue locks are released before the startup failure is returned.
- `AC-003`: The bootstrap implementation exposes a clearer startup/shutdown support structure than the current mixed inline shape.
- `AC-004`: Existing focused bootstrap integration coverage remains green after the refactor.
- `AC-005`: A new focused test proves the startup rollback behavior on provider-start failure.

## Requirement Coverage Map

| Requirement | Supported By Investigation Finding |
| --- | --- |
| `FR-001` | `F-004`, `F-005` |
| `FR-002` | `F-005` |
| `FR-003` | `F-004` |
| `FR-004` | `F-004`, `F-005` |
| `FR-005` | `F-006` |

## Acceptance Criteria Traceability

| Acceptance Criterion | Primary Requirements |
| --- | --- |
| `AC-001` | `FR-001`, `FR-002`, `FR-005` |
| `AC-002` | `FR-001`, `FR-002`, `FR-005` |
| `AC-003` | `FR-003` |
| `AC-004` | `FR-004`, `FR-005` |
| `AC-005` | `FR-001`, `FR-002`, `FR-005` |
