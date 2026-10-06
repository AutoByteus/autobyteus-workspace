# Implementation Handoff — standalone-collaborator-artifact-hydration

Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration/tickets/in-progress/standalone-collaborator-artifact-hydration/` (`<T>`). Source paths are under `autobyteus-web/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Small + Low); independent architecture review was not selected. The handoff rule for a completed Small/Medium + Low implementation, with self-review done, routes to `/api_e2e_engineer`.
- Requirements doc: `<T>/requirements-doc.md` (SR-001, approved by the user)
- Investigation notes: `<T>/investigation-notes.md`
- Solution revision record: `<T>/solution-revision-record.md`
- Design spec: `<T>/design-spec.md`
- Solution handoff: `<T>/solution-handoff.md`
- Supplemental task artifacts: none. The predecessor `collaboration-member-artifact-hydration` (REQ-006 origin, `memberRunStateHydration` owner) is reference only.
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable` (direct route)
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

Collaborators of a standalone run now hydrate through the shared member-run state owner, mirroring AgentOrg staging.

- `services/agentCollaboration/agentRunCollaborationHydration.ts` (`stageAgentRunCollaborationContext`):
  - Each collaborator is fetched with `fetchMemberRunState({ runId, fetchProjection: () => fetchProjection(hostRunId, child) })`, so its projection and artifacts load in parallel and staging fails if either fails.
  - Each collaborator stages a `MemberRunStateCommit`. The revision source is unchanged: `input.activityRevisions` or the store revision, captured before the fetch.
  - The staged callback `commitActivities` is renamed `commit`. It keeps the ownership-released check, then calls `commitMemberRunStates`, which commits activities and then merges artifacts, writing nothing on conflict. On conflict it throws the existing error. The local `replaceProjectionActivitiesIfRevisions` call is gone.
- Rename `commitActivities` → `commit` in `stores/agentRunCollaborationStore.ts` (`publish`) and `services/agentCollaboration/agentRunCollaborationStreamingService.ts` (`publish` option type and call), and in their specs:
  - `agentRunCollaborationStore.spec.ts`
  - `agentRunCollaborationStoreClosure.spec.ts` (a newer base spec, also covered)
  - `agentRunCollaborationStreamingService.spec.ts`

  No `commitActivities` remains in the web package, and no alias was added.
- `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` (design item 4): its `commitActivitiesMock` was only a stale local mock variable, already wired to `commitTeamRunHydration`. It is renamed `commitTeamRunHydrationMock`; there was no behavior issue.
- `memberRunStateHydration.ts` doc comment now names standalone-run collaborators.
- `docs/agent_artifacts.md` owner table: left for delivery's docs sync (design item 5).

- Implementation cycle: `Initial`
- Implementation revision record: `<T>/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 4 production files changed. The real change is in one staging function; the rest are mechanical renames in 2 callers and one doc comment.
  - It reuses the existing owner and store semantics. No API, persistence, server or ownership-boundary change.
  - It is the same pattern already reviewed for AgentOrg.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see below)
- New design impact or escalation trigger: `None`. ASM-001 is consistent with the server code (see Important Assumptions).

### Lightweight Implementation Self-Review

- Same shape as `agentOrgContextHydration.ts`: fetch through the owner, stage `MemberRunStateCommit`, commit with `commitMemberRunStates`, throw on conflict.
- Existing guards kept:
  - The revision is captured from `input.activityRevisions` or the store before any I/O.
  - The ownership-released check stays both after staging and at the start of `commit()`, so a released staging writes neither activities nor artifacts.
- Failure behavior: an artifact fetch error fails staging exactly as a projection error does (AC-005, REQ-003). No new policy.
- Merge semantics: the store's `updatedAt` merge, so a live entry newer than the snapshot is kept (AC-003).
- Clean cut: no aliases and no leftover `commitActivities`. The collaborator activities field is replaced, not duplicated.
- Sizes: `agentRunCollaborationHydration.ts` is about 130 lines; all changes are small.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001, AC-002) | Collaborator artifacts listed after reload and for historical host runs | Host run open or stream recovery → `stageAgentRunCollaborationContext` → `fetchMemberRunState` per collaborator → `publish` → `commit()` → `commitMemberRunStates` | Unit: active and historical; all 3 collaborators, including members of a collaborator Team, get their artifacts. Fails on base. |
| BEH-002 (REQ-002; AC-003) | Live entries kept, no duplicates | Store merge through the owner | Unit: a newer live `streaming` entry is kept and no duplicate row appears. |
| BEH-001 (REQ-003; AC-005) | Artifact failure behaves like a projection failure | Owner throws, so staging fails | Unit: staging rejects and nothing is written. |
| BEH-003 (REQ-003; AC-004) | Standalone, Team and Org unchanged | Not touched (only a test mock rename in the Team spec) | Existing suites pass; full-suite comparison below. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Production:
  - `services/agentCollaboration/agentRunCollaborationHydration.ts`
  - `stores/agentRunCollaborationStore.ts`
  - `services/agentCollaboration/agentRunCollaborationStreamingService.ts`
  - `services/runHydration/memberRunStateHydration.ts` (comment only)
- New spec `services/agentCollaboration/__tests__/agentRunCollaborationHydration.spec.ts` (6 tests), covering:
  - AC-001 and AC-002 (active and historical)
  - AC-003 (live race)
  - conflict: nothing written
  - ownership released: nothing written
  - AC-005 (failure)
- Renamed specs: `agentRunCollaborationStore.spec.ts`, `agentRunCollaborationStoreClosure.spec.ts`, `agentRunCollaborationStreamingService.spec.ts`, `teamRunOpenCoordinator.spec.ts` (mock name only).

## Important Assumptions

- ASM-001 (the server resolves collaborator runIds for `getRunFileChanges` and the content route) is consistent with the server code. `RunFileChangeProjectionService.readProjectionContext` falls back to `CollaborationExecutionLocationService.findAgent`. Its standalone-root source (`StandaloneRootLocationService.findAgent`, with no root given) scans the host collaboration trees and locates collaborator children, including members of collaborator Teams. It has not been probed live, because node 8001 has no collaborator data. This is the same global scan noted as FUP-001.

## Known Risks

- The live check for AC-001/AC-002 needs a created collaborator run (API/E2E). That run also verifies ASM-001.
- FUP-001 (server global-scan lookups) is unchanged and awaits a user decision.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (REQ-006 follow-up)
- Reviewed root-cause classification: per `design-spec.md` (the collaborator path did not use the shared member-run state owner)
- Reviewed refactor decision: reuse the existing owner; no new structure
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead or obsolete code removed in scope: `Yes`. The local activity replacement and the `commitActivities` name are gone.
- Shared structures remain tight: `Yes` (reuses `MemberRunStateCommit`)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Deviation: `None`

## Environment Or Dependency Notes

- The fresh worktree needed `pnpm install` (through `/tmp/pnpm-shim/pnpm` → `corepack pnpm`, recreated because `/tmp` had been cleared) and `pnpm exec nuxt prepare`.

## Local Implementation Checks Run

- Collaborator, renamed and owner specs (`services/agentCollaboration`, `agentRunCollaborationStore*.spec.ts`, `teamRunOpenCoordinator.spec.ts`, `memberRunStateHydration.spec.ts`): 50/50 pass.
- New spec on base source: all 6 tests fail.
- Typecheck and full web unit suite: `tsc --noEmit` reports no errors in the changed source files (the repo has many pre-existing errors in specs).
  - Full web unit suite (`pnpm -C autobyteus-web test:nuxt --run`): with the change, 36 failed and 3682 passed (573 files); on base `0d3e6e82f`, 34 failed and 3678 passed (572 files).
  - The only differences from base are 2 tests in `components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts`. That spec is a known timing-flaky file:
    - it imports nothing from the changed code;
    - it fails 4 tests on base inside the suite;
    - run alone on the change it fails 5, 7 and 7 of 14 across three runs;
    - it flipped the other way in the predecessor ticket.
  - No other new failures.

## Frontend Rendered-Result Check (When Applicable)

- Affected surface: the Artifacts tab for a standalone run's collaborators. Only the hydration feeding the existing list changed; no UI or rendering code.
- Rendered inspection: not performed. There is no collaborator data on the local node; creating a collaborator run is part of the planned API/E2E browser journey for AC-001/AC-002.

## Downstream Coverage Hints / Suggested Scenarios

- Create a standalone run whose collaborator, an Agent or a Team member, produces 2 or more artifacts. Then:
  - reload, select the collaborator and open Artifacts: everything is listed and previews (AC-001);
  - terminate, open the run from history and select the collaborator: everything is listed (AC-002).
- Check the content route returns 200 for each collaborator artifact (ASM-001).
- Standalone, Team and Org regression (AC-004).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Browser E2E for AC-001/AC-002 with a created collaborator run, including the live check of ASM-001.
