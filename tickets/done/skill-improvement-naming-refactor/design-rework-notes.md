# Design Rework Notes

## Rework Trigger

Architecture review round 1 failed because the initial design depended on an app-data migration but did not fully specify migration failure/conflict/session decommission semantics.

## User Clarification

The user clarified that the self-improvement / Skill Improvement feature is still development-phase, disabled by default, and not used by users. Therefore old development-phase data does not need migration or compatibility preservation. This does not mean retaining stale code; stale active source/API/UI/runtime code should be removed or renamed to the target model.

## Rework Decision


It also clarifies that this is a naming/model cleanup refactor: existing manual Skill Improvement business logic should remain equivalent while stale names, identifiers, files, and code paths are removed or renamed.

The revised package removes the migration dependency entirely:

- no app-data migration for this rename;
- no runtime fallback reads from old settings, paths, built-in ids, GraphQL names, or metadata keys;
- no old/new conflict handling, old-data cleanup routines, or startup gating;
- code models the clean target state only, with stale active code removed/renamed;
- old local/generated/development state is ignored and outside the runtime contract.

This keeps the codebase clean and aligns with the project principle against backward compatibility and legacy retention: remove stale code, but do not build data migration/compatibility machinery for unused development-phase data.

## Architecture Review Findings Addressed

- AR-SI-001: Resolved by removing migration as an in-scope mechanism. No migration failure/conflict semantics are needed because no migration is implemented.
- AR-SI-002: Resolved by removing old built-in id session continuity from scope. Old sessions using `autobyteus-skill-evolver` are outside the clean-state runtime contract.
- AR-SI-003: Resolved by clarifying that run records remain globally scoped under the app memory root; target memory is only for target-scoped improver session state and work traces.
