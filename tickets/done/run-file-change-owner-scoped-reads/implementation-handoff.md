# Implementation Handoff — run-file-change-owner-scoped-reads

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected and passed (`ARCH-REV-002`, round 2, SR-003). Carried classification `Medium` / `High`, so `get_handoff_rules` returns `/software_engineering_team/code_reviewer` (Large or High → source review).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/`
- Requirements doc: `requirements-doc.md` (Approved, SR-003)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001..SR-003)
- Design spec (required on every route): `design-spec.md` (SR-003, `Ready`)
- Supplemental task artifacts: none behavior-defining (autobyteus-93 timing evidence only)
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads`, branch `codex/run-file-change-owner-scoped-reads`, base `origin/personal` @ `cba6b85122`.
  - `5d6127cee4` feat(server): scope file-change reads to their owner
  - `03f2d4da05` feat(web): send the owner with every file-change read
  - ticket documents and evidence: the docs commit that follows (see the handoff message for its hash)

Every file-change read now names its owner. Server: `RunFileChangeProjectionService` serves a standalone run by run id (standalone metadata decides first, then live or stored) and members already located by their family's member-view service; the collaboration fallback scan, its three stored-only locators and the dead `getEntry` are gone. The team, org and hub member-view services serve a member's file list and file entry from one named root; the team lookup now passes `rootTeamRunId`. `locatedExecutionSource` is the one owner of a located member's configured or catalog-copy source (all three families) and `locatedLaunchConfiguration` delegates to it, so team and org task agents get their own workspace root. New GraphQL `getTeamMemberFileChanges`, `getAgentOrgMemberFileChanges`; three new REST owner routes share one content response policy. Web: `AgentRunReadSubject` (moved, no alias), `fetchRunFileChanges(subject)` for all five callers, `runFileChangeContentPath(subject, path)`, viewer/Artifacts tab/mobile read through the active target's subject.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 9 server source files changed (+1 new) and 16 web source files changed (including the generated types; +2 new), all inside existing owners; the API contract changes as designed (two new queries, three new routes, run-id reads narrowed, team/org member reads live while running). No persistence, security or deployment change. None of the design's escalation triggers fired: no out-of-repo caller of the run-id surfaces; the member-view locators needed no extra identity; the containment e2e keeps a scanning trigger.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent source review route)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Copy content hub-scoped | `ArtifactContentViewer` → `runFileChangeContentPath({kind:'standaloneMember'})` → `GET /agent-collaborations/:hostRunId/agent-runs/:agentRunId/file-change-content?memberAddress=&path=` (`api/rest/run-file-changes.ts`) → `StandaloneRootMemberViewProjectionService.resolveFileChangeEntry` → `RunFileChangeProjectionService.resolveLocatedCollaborationMemberEntry` | Implemented. Tests: hub `resolveFileChangeEntry` stored/running/not-in-hub; REST route unit tests |
| BEH-002 | Team member list team-scoped, live while running | `teamRunContextHydrationService` / `teamMemberProjectionHydrationService` → `fetchRunFileChanges({kind:'teamMember'})` → `getTeamMemberFileChanges` (`team-run-history.ts`) → `TeamMemberRunViewProjectionService.getFileChanges` → `getLocatedCollaborationMemberProjection` (live when `location.isActive`) | Implemented. Real stored trees + 20 unrelated team roots: only `team-1` read when saved; no stored read when running |
| BEH-003 | Team member content team-scoped; task agent root from `locatedExecutionSource` | `GET /team-runs/:teamRunId/agent-runs/:agentRunId/file-change-content` → `resolveFileChangeEntry` → `resolveLocatedCollaborationMemberEntry`; root via `locatedLaunchConfiguration` → `locatedExecutionSource` | Implemented. Configured member + team task agent, saved and running, workspace-relative paths → bytes; pending while running → 409. Mutation check: with the old `locatedLaunchConfiguration` the 4 task-agent cases fail |
| BEH-004 | Org member list org-scoped | `agentOrgContextHydration` → `fetchRunFileChanges({kind:'agentOrgMember'})` → `getAgentOrgMemberFileChanges` (`agent-org-run.ts`) → `AgentOrgMemberRunViewProjectionService.getFileChanges` | Implemented; only `org-1` read among 21 org roots |
| BEH-005 | Org member content org-scoped (incl. root and member-team task agents) | `GET /agent-org-runs/:orgRunId/agent-runs/:agentRunId/file-change-content?memberAddress=&path=` → `resolveFileChangeEntry` | Implemented; configured direct, mounted-team member, org-root task agent and member-team task agent, saved and running |
| BEH-006 | Standalone run preserved; run-id reads of members get nothing (AR-001) | `getRunFileChanges` → `getStandaloneRunProjection`; `/runs/:runId/file-change-content` → `resolveStandaloneRunEntry`; both `readMetadata(runId)` first, no metadata → `[]`/`null` with no active check and no tree read | Implemented. Unit tests: member run id with owner saved and running (active in registry) → `[]`/`null`, `getActiveRun` never called; hub served by its own id running and saved, its copy id → `[]`. Integration: team member id via run-id surfaces → `[]` / 404 |
| BEH-007 | Copy list preserved, fetch moved to the shared fetch | `agentRunCollaborationChildHydration` → `fetchRunFileChanges({kind:'standaloneMember'})` (same query `agentRunCollaborationMemberFileChanges`); local `fetchFileChanges` removed | Implemented; existing child hydration spec unchanged and green |
| BEH-008 | Team member conversation/older pages use the named team root | `TeamMemberRunViewProjectionService.requireLocation` → `findAgent({ rootTeamRunId, agentRunId })`, tagged with `tagTeamAgentExecution`; same messages, class `CollaborationMemberNotFoundError` | Implemented; unit test asserts the root is passed and the error class/messages |
| BEH-009 | Mobile reads through the owner subject | `useMobileFocusedRunIdentity.focusedReadSubject` (active target's `browse` when it is the focused run's) → `MobileArtifacts` → viewer | Implemented; identity spec covers agent run, team member, stale route |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src`):
- `run-history/services/run-file-change-projection-service.ts` — standalone-run reads (renamed, metadata first), located-member list and entry, `entryIn`; fallback, locators, `collaborationLocations`/`memoryDir` options and `getEntry` removed.
- `agent-collaboration/execution/services/collaboration-execution-location-service.ts` — `locatedExecutionSource`, `locatedLaunchConfiguration` delegates, exported `tagTeamAgentExecution` and `LocatedTeamCollaborationAgentExecution` (the tagged team variant, so the team member-view service needs no cast).
- `agent-collaboration/execution/domain/collaboration-member-not-found-error.ts` (new).
- `run-history/services/team-member-run-view-projection-service.ts`, `run-history/services/agent-org-member-run-view-projection-service.ts`, `standalone-agent-run-root/services/standalone-root-member-view-projection-service.ts` — `getFileChanges` / `resolveFileChangeEntry`, `locatedExecutionSource` replaces the three `childSourceOf`, not-found error class.
- `api/graphql/types/run-file-changes.ts`, `team-run-history.ts`, `agent-org-run.ts`; `api/rest/run-file-changes.ts` (four routes, `sendFileChangeContent`, member services obtained lazily per request).

Web (`autobyteus-web`):
- `types/agent/agentRunReadSubject.ts` (new: `AgentRunReadSubject`, `agentRunIdOf`); importers `eventMonitorActiveTracePageService.ts`, `eventMonitorActiveTraceBrowse.ts`, `AgentEventMonitor.vue`, `activeAgentWorkspaceTarget.ts`.
- `services/runHydration/runFileChangeHydrationService.ts` (`fetchRunFileChanges(subject)`, `network-only`, `queryDeduplication: false`) and its five callers.
- `services/runFileChanges/runFileChangeContentPath.ts` (new).
- `components/workspace/agent/ArtifactContentViewer.vue` (`readSubject` prop, guard, refetch when the URL changes), `ArtifactsTab.vue`, `components/mobile/MobileArtifacts.vue`, `composables/mobile/useMobileFocusedRunIdentity.ts`.
- `graphql/queries/runHistoryQueries.ts`, `generated/graphql.ts`.

Tests: new `tests/unit/agent-collaboration/execution/located-execution-source.test.ts`, `tests/unit/run-history/collaboration-member-file-change-reads.test.ts` (real stored trees, real location services and REST routes); updated projection, member-view, REST, GraphQL, integration and two E2E test files; web viewer, fetch, hydration, mobile and fixture specs.

## Important Assumptions

- ASM-002 holds: `git grep` finds no caller of the run-id surfaces outside `autobyteus-web` and server tests/docs.
- A standalone run has standalone metadata before it is activated (design SR-003 evidence). The integration test's live-run case now seeds `run_metadata.json`, as `prepareAgentRun` does in production.
- The viewer's `readSubject` is the active workspace target's `browse`; when the subject's agent run is not the artifact's run (selection in flight) the viewer requests nothing and refetches once the URL becomes valid (it is part of the viewer's watch).

## Known Risks

- R-001 (accepted, DEC-003): team and org member lists are live while the root runs.
- R-003: the containment e2e's hub-scanning trigger is now a team-member context-file read (`/rest/team-runs/<host>/agent-runs/<child>/context-files/missing.txt`), the surface of follow-up FU-A, which still runs the unscoped compound lookup. When FU-A scopes context-file reads, that trigger must move. Not run here (gated); API/E2E should confirm it still produces the "Skipping standalone run" warning, or pick another still-scanning surface.
- Codegen: the base `generated/graphql.ts` was stale. A faithful regeneration also adds types the base server already serves (delegated launch, project-task search, embedding retry, `loadIssue`) — see `evidence/IMP-07-web-codegen.txt`.
- Web has no typecheck script and `vue-tsc` is not installed; web type errors are not checked by any command here (vitest transpiles only).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Performance (with an API identity correction)
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: member location lives only in the member-view services; `RunFileChangeProjectionService` imports no location service (only `locatedLaunchConfiguration` and the tagged type). Routes and resolvers call only member-view services or the file-change service. No import cycle (`collaborator-source-projector.ts` imports domain only).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — collaboration fallback and its locator construction; `getEntry`; `collaborationLocations` and `memoryDir` constructor options; three `childSourceOf`; private `tagTeam`; web `fetchFileChanges` in copy hydration; `EventMonitorActiveTraceBrowseSubject` (no alias); test-only options and stubs for removed behavior (`unscopedLookup`, member `GetRunFileChanges` stubs in the web hydration/history/store specs and the org Apollo fixture).
- Dead code found elsewhere, listed as follow-up: `LocatedStandaloneRootAgentExecution.launchConfiguration` (`standalone-agent-run-root/services/standalone-root-location-service.ts:213`) is now written but no longer read in `src` — its only reader was `locatedLaunchConfiguration`, which now goes through `locatedExecutionSource`. Evidence: `git grep "\.launchConfiguration"` in `src`; only `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts:300` asserts it. That file is outside this ticket's Change Scope ("the three family location services" are left alone), so it is a follow-up (FU-B below).
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — largest file 356 effective lines (`runHistoryQueries.ts`); largest delta 137 lines (`api/rest/run-file-changes.ts`).
- Notes: follow-ups for the Project Task manager:
  - FU-A (from the design): context-file reads for team members should name the team root.
  - FU-B (new): remove `LocatedStandaloneRootAgentExecution.launchConfiguration` and its test assertion; `locatedExecutionSource` now owns that answer.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (reads only)
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`, `pnpm -C autobyteus-server-ts test:integration:prepare`, `pnpm -C autobyteus-server-ts build` were run in this worktree. Untracked build outputs (`applications/brief-studio/dist/`, SDK `dist/` folders) are not staged.
- type-graphql adds a resolver's argument metadata again each time a schema is built in one process. `agent-org-run-config.test.ts` built the full schema twice, which shifted the new query's arguments in the second build; the test now builds the schema once and shares it. Production builds the schema once.
- The run-file-changes integration test registers placeholder Studio API services, because the team-run resolver binds them on construction.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `03f2d4da05` | macOS, node, pnpm (header) | server `src` | all server | Pass | `evidence/IMP-01-server-typecheck.log` | `exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `03f2d4da05` | macOS, test isolation | all server unit tests incl. new `located-execution-source.test.ts`, `collaboration-member-file-change-reads.test.ts` and updated projection/member-view/REST/GraphQL tests | BEH-001..008, AC-002..AC-009, AC-011 | Pass | `evidence/IMP-02-server-test-unit.log` | `Test Files  735 passed | 4 skipped (739)`, `Tests  6019 passed | 7 skipped (6026)`, `exit=0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration` (after `test:integration:prepare`) | `03f2d4da05` | macOS, test isolation | all server integration incl. `run-file-changes-api.integration.test.ts` (standalone, team-member team-scoped, run-id narrowed) | BEH-002, BEH-003, BEH-006, AC-002, AC-006, AC-007 | Pass | `evidence/IMP-03-server-test-integration.log` | `Test Files  77 passed | 19 skipped (96)`, `Tests  415 passed | 70 skipped (485)`, `exit=0` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run` | `03f2d4da05` | macOS, Nuxt test env | all web unit/component tests incl. viewer owner routes and guard, fetch dispatch, hydration subjects, mobile subject | BEH-001..BEH-009, AC-001..AC-005, AC-012 | Pass | `evidence/IMP-04-web-test-nuxt.log` | `Test Files  636 passed | 2 skipped (638)`, `Tests  4521 passed | 5 skipped (4526)`, `exit=0` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `03f2d4da05` | macOS | web sources | — | Pass | `evidence/IMP-05-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-06a | `pnpm -C autobyteus-web test:e2e:diagram-zoom-viewer --output-dir …` (run 1) | web identical to `03f2d4da05` | headless Chrome, probe-owned cold Nuxt dev server | fixture page rendering `ArtifactContentViewer` (buffered content, `:read-subject="null"`) and the conversation surface | rendered viewer | Fail (1 case) | `evidence/IMP-06a-diagram-zoom-viewer-probe-run1/` | `DZV-BR-008: Timed out waiting for restored fine-primary concealment transition; last=false` |
| IMP-06b | same probe, run 2 | web identical to `03f2d4da05` | headless Chrome, warm Nuxt dev server | same | rendered viewer | Pass | `evidence/IMP-06b-diagram-zoom-viewer-probe-run2/` | `Diagram zoom viewer probe passed.` |
| IMP-07 | build server from the worktree, start it on a private data dir and free port, `BACKEND_GRAPHQL_BASE_URL=… pnpm -C autobyteus-web codegen`, stop server | server `5d6127cee4`; generated file in `03f2d4da05` | macOS, `env -i`, temp HOME | GraphQL schema and web documents | design step 5 | Pass | `evidence/IMP-07-web-codegen.txt` | `['getRunFileChanges', 'getAgentOrgMemberFileChanges', 'agentRunCollaborationMemberFileChanges', 'getTeamMemberFileChanges']` |

- IMP-06a cause analysis (TESTING.md Rule 9): DZV-BR-008 checks the conversation surface's mermaid expand button hiding again after the probe moves the pointer away; it does not render or fetch through `ArtifactContentViewer`, and this change touches nothing that surface runs (only a type-only import in `AgentEventMonitor.vue`). Run 1 was the first Nuxt dev start in this worktree (cold dependency optimization, which TESTING.md "Browser probes" notes reloads pages); run 2 passed every case, BR-008 included. Not caused by this change; no product or probe change made.
- A mutation check during development: restoring the old `locatedLaunchConfiguration` rule made the 4 task-agent cases of `collaboration-member-file-change-reads.test.ts` fail (not kept as evidence; the test is in IMP-02).
- Not run, and why:
  - Server E2E (`RUN_AGY_FAILURE_E2E=1` gated): `standalone-unreadable-tree-containment.e2e.test.ts` (R-003 trigger changed) and `agent-run-collaboration-member-file-changes.e2e.test.ts` (run-id assertion narrowed) were edited but not run — E2E execution belongs to API/E2E.
  - Web typecheck: no script exists and `vue-tsc` is not installed.
  - Real-stack browser journey of opening member files (AC-001 browser probe), timing AC-010 / QR-001 / U-001: API/E2E.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: desktop Artifacts tab and mobile Artifacts view — opening a file of a standalone run, team member, org member or delegated copy. No visible layout or flow change (requirements: UI/UX `No`); only the request each file open makes changes.
- Approved UI/UX, interaction, requirement, or design references: requirements "UI, Interaction, And Experience Requirements" (not applicable); design spec viewer guard (R-002).
- Existing design system, shared components, and adjacent product surfaces reviewed: `ArtifactContentViewer` states (loading, pending 409, deleted 404, error) unchanged; `ArtifactsTab`, `MobileArtifacts`.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser probes — `test:e2e:diagram-zoom-viewer` fixture page, which renders `ArtifactContentViewer`.
- States, layouts, viewports, and interactions inspected: the probe's viewer, zoom and toolbar cases (light/dark, wide/coarse) all pass on a warm server (IMP-06b). Component tests mount the viewer with each owner kind and assert the exact URL, the bytes shown, the no-request guard while the subject names another run or is missing, and the refetch once it matches.
- Visual or interaction issues found and corrected: none.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-04, IMP-06b. Not rendered against a real server with team/org/hub member files; that journey is AC-001's browser probe for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 browser probe: a hub with a copy; open the copy's file in the Artifacts tab; the request is `/rest/agent-collaborations/<hub>/agent-runs/<copy>/file-change-content?memberAddress=…&path=…`; a deleted file shows "not available".
- AC-003 / AC-005 on a real server: a team task agent and an org task agent (root and member-team) writing a workspace-relative file, with the owner running (pending file → 409) and then saved (bytes).
- AC-007 on a real server: `getRunFileChanges(<member id>)` → `[]` and `/rest/runs/<member id>/file-change-content` → 404 while the member's owner runs; the hub's own id still served.
- AC-013 / R-003: run `standalone-unreadable-tree-containment.e2e.test.ts`; confirm the context-file trigger still yields `Skipping standalone run '<bad>'`.
- `agent-run-collaboration-member-file-changes.e2e.test.ts`: the run-id query now gives a running copy `[]`.
- AC-010 / QR-001: owner-scoped list and content timings on a small vs a large seed (hundreds of unrelated saved team runs).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Executable validation of AC-001..AC-013 through real HTTP/GraphQL and a browser, including the two edited gated E2E files, and the timing comparison (AC-010, U-001). Implementation checks above are not API/E2E sign-off.
