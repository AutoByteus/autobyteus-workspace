# Implementation Plan

## Status
Finalized (pre-implementation; analysis turn)

## Scope Classification
Small

## Problem Summary
Temporary/live team rows in the workspace history sidebar derive member workspace display from `memberContext.config.workspaceId` only. Remote members intentionally have `workspaceId = null`, while their configured path is stored in team-level overrides (`memberOverrides[memberName].workspaceRootPath`).

## Planned Changes
- CHG-1 (`Modify`): `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runTreeStore.ts`
  - Add helper resolver that supports both workspace sources:
    - local workspace by `workspaceId` (embedded/local),
    - member override `workspaceRootPath` (remote fallback).
  - Use helper in `getTeamNodes()` for team-context fallback projection rows.

- CHG-2 (`Modify`): `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/__tests__/runTreeStore.spec.ts`
  - Add unit test proving remote member workspace chip source from override when workspaceId is null.
  - Keep embedded-member projection regression coverage passing.

## Verification Plan
- Unit tests
  - `runTreeStore` new case: remote member override path appears in team node row.
  - Existing `runTreeStore` team-node projection test still passes for workspaceId-based embedded member.

- Integration test (optional, if test harness coverage exists)
  - Create temporary team with remote override path and verify sidebar displays remote member workspace label before first message dispatch.

## Requirement Traceability
- AC-1 -> CHG-1 preserves workspaceId path for embedded members.
- AC-2 -> CHG-1 adds remote override path fallback for local team projection.
- AC-3 -> no changes in `agentTeamRunStore` payload generation path.
- AC-4 -> no changes in manifest-backed persisted team rows.

## Risks and Guards
- Risk: member key mismatch for overrides (route key vs display key).
  - Guard: resolver checks both route key and leaf segment.
- Risk: nested route keys could map incorrectly.
  - Guard: explicit key candidate order and null-safe fallback.
