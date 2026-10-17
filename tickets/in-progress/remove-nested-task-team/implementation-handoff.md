# Implementation Handoff — remove-nested-task-team

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team`, branch
`codex/remove-nested-task-team`, base `origin/personal` `db00ba16a9`, finalization target `origin/personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High);
  ARCH-REV-002 Pass. Next: `get_handoff_rules` → Code Reviewer.
- Requirements doc: `tickets/in-progress/remove-nested-task-team/requirements-doc.md` (SR-006)
- Investigation notes: `tickets/in-progress/remove-nested-task-team/investigation-notes.md`
- Solution revision record: `tickets/in-progress/remove-nested-task-team/solution-revision-record.md` (SR-001..SR-006)
- Design spec: `tickets/in-progress/remove-nested-task-team/design-spec.md`
- Supplemental task artifacts: `DESIGN.md` Mandatory Design Rule 7 (written upstream, committed with this work)
- Design review report: `tickets/in-progress/remove-nested-task-team/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/remove-nested-task-team/architecture-review-revision-record.md`
  (and `handoff-architecture-review.md`)
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: CR-001 Local Fix — three unused imports removed in touched server files; see revision record)
- Implementation revision record: `tickets/in-progress/remove-nested-task-team/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-001..SR-006 (SR-006 authoritative)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001; API/E2E / delivery: N/A
- Triggering finding IDs: CR-001

A team inside a team is no longer represented anywhere in current code:

1. Server records and runtime: `TaskTeamNestedTeamExecution` and the `TaskTeamMemberExecution` union are gone;
   `TaskTeamExecution.members: readonly TaskTeamAgentExecution[]`. The shared record parser reads agent members
   only (a nested member now fails `requireKeys` — no tolerant reader). The three run indexes, three tree
   mutators, task-team restore, delegated launch selection, delegated stop set, task-execution projection,
   task-delegation resolution/identity factory and both view projectors handle agent members only.
   `TeamRunAgentTeamNode.children` is `readonly TeamRunAgentNode[]`; the flat factory's / configured registry's
   "cannot contain a configured Team" runtime checks and `cloneTeamRunNode` recursion are replaced by the type.
2. Contracts: `TaskTeamNestedTeamExecutionDto`, the nested schema and member union (team stream),
   `ConfiguredTeamExecutionDto` / `ConfiguredMemberExecutionDto` (`configured_team`), and
   `TaskTeamNestedExecutionDto` / `TaskTeamMemberExecutionDto` (collaboration stream) are removed; `dist` rebuilt.
3. Web: nested-member and `configured_team` handling removed from the team tree selectors, tree mutations,
   agent-source selectors, delegated launch rows, copy liveness, run-member tree, history rows, stored
   configuration view, existing-run model draft, hydration/launch seed, Org view index and Org history rows;
   `TeamDefinitionAgentTeamNode` (and the depth display / unused options) removed; dead nested-team / sub-team
   strings removed (en, zh-CN, generated); the stable-row Team aggregate dot / branch status removed (stable
   team-run rows are the root Team's Agents).
4. DS-002 (DESIGN.md rule 7): `StandaloneRootLocationService.findAgent/findAgentSync/listAgents` without a root id
   skip a standalone tree they cannot read (any cause), warn once per scan naming the run
   (`Skipping standalone run '<id>': its collaboration tree cannot be read: <reason>`), and continue; with an
   explicit root id they still throw, so opening that run reports its error.
5. Released migrations: unchanged (SR-006). No retired-shape (v1.4.53–v1.4.69) fixtures were added.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: breadth matched the design (server ≈30 src files, two contract packages, web ≈45 src
  files + specs/fixtures); the change narrows two shared wire contracts and the persisted-tree parser and adds
  containment at a cross-run boundary. No site classified as "team inside a team" turned out to serve
  organizations or delegation (see Classification table), so no escalation trigger fired.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Delegating to a team builds a flat task team; the type no longer admits a team inside a team | `team-run-config.ts` (`children: TeamRunAgentNode[]`, `cloneTeamRunAgentTeamNode`), `flat-team-execution-factory.ts`, `flat-team-member-config-resolver.ts`, `configured-agent-execution-registry.ts`, `task-team-run-identity-factory.ts`, `task-delegation-execution-resolution.ts`, `task-team-node-restoration.ts`, `delegated-launch-selection.ts`, `delegated-stop-set.ts`, `task-execution-tree-projection.ts` | Done; delegation (task teams under members, task teams delegated inside task teams) unchanged and covered |
| BEH-002 | Retired nested records are not read; team/org runs excluded at startup (unchanged validator); a standalone run fails to open with the parser error; cross-run standalone lookups skip and warn | `run-execution-tree-shared-record-schemas.ts` (`parseTaskTeamMember` agent-only), `standalone-root-location-service.ts` (DS-002) | Done; new `standalone-root-location-containment.test.ts`; real-app check below |
| BEH-003 | No rendering path for a sub-team; org teams and delegation rows preserved | `team-execution-view-projector.ts`, `collaboration-execution-tree-dto-projection.ts`; web `teamExecutionTreeSelectors.ts`, `runHistoryTeamRows.ts`, `runHistoryTeamExecutionRows.ts`, `teamExecutionContextFactory.ts`, `WorkspaceStableExecutionRow.vue`, `WorkspaceTeamExecutionTree.vue`, `agentOrgHistoryRows.ts`, `agentOrgExecutionViewIndex.ts` | Done |
| BEH-004 | Stream DTOs carry agent members only | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` (+ `dist`) | Done |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (see Known Risks for the launch-scope boundary note).

## Classification Of Every "Nested" Site (R-1)

Rule: a team as a *member* of a team → remove; organization → team, and delegation (a task team under a member, a
task team delegated inside a task team) → keep.

| Site | Classification | Evidence | Action |
| --- | --- | --- | --- |
| `TaskTeamNestedTeamExecution`, member union, guards (`run-execution-tree-shared-records.ts`) and re-exports | team as member of a team | `members` union admitted a TeamRun | Removed |
| `parseTaskTeamMember` nested branch; delegator / run-id visitors | team as member | same | Agent-only |
| `team-execution-index.ts` / `agent-org-execution-index.ts` / `standalone-root-execution-index.ts` nested visits and `nested` execution kind | team as member | `executionKind: "nested"` existed only for member teams | Removed; `TeamExecutionKind` / `AgentOrgTeamExecutionKind = "configured" \| "task"` |
| three tree mutators' nested mapping | team as member | — | Removed |
| `task-team-node-restoration.ts` recursion | team as member | restored member TeamRuns | Agent children only |
| `delegated-launch-selection.ts` `teamCopyAgents` recursion, `delegated-stop-set.ts` member recursion | team as member | — | Removed; task-team `taskExecutions` still visited (delegation) |
| `TeamRunAgentTeamNode.children: TeamRunNode[]`, `cloneTeamRunNode`, flat factory / configured registry checks | team as member (runtime) | no producer builds a team child since v1.4.70 | Tightened to agents; checks removed |
| `LocatedExecutionGroup.executionKind` | the group kind never is a member | `LocatedTeamExecutionKind = Exclude<…, "task_team_member">` | Narrowed |
| memory targets group rank for nested teams without `startedAt` | team as member | — | Removed (configured first, then task teams by start) |
| `flat-team-topology-planner.ts` `hasSubTeams` | dead constant | always false | Removed |
| `subTeamRunFactory` (`flat-team-execution-manager*.ts`, `task-team-execution-registry.ts`) | delegation | builds task TeamRuns delegated by members | Kept (name only) |
| Org status projector "nested task-Team leaves" comment | delegation | task teams delegated inside task teams | Comment reworded, kept |
| `CONFIGURED_TEAM` scope kinds (model config, memory explorer, Org run config) | root team / org team | root scope `/`, org teams | Kept |
| `agent-package-definition*` "nested definitions" | definition folders | Team/Org folders holding agent definitions | Kept |
| Contracts: nested / `configured_team` DTOs | team as member | no server producer of `configured_team` | Removed |
| Contracts test "nested Team and nested Agent scopes" (collaboration) | org → team | Org snapshot scopes | Kept |
| Web `'configured_team'` in Org selection (`agentOrgExecutionViewIndex.ts`, `agentOrgExecutionContext.ts`, `useWorkspaceHistoryTreeState.ts`) | org team | Org configured Team selection | Kept |
| Web row kind `'configured_team'` (`teamExecutionViewModels.ts`) | root team row | only the `/` row uses it now | Kept (root) ; `'task_team_member'` row kind removed |
| Web `'task_team_member'` agent identity kind (`agentRunCollaborationIndex.ts`, `agentOrgExecutionViewIndex.ts`) | delegation | an *agent* member of a delegated task Team | Kept |
| Web history `agent_team` row kind | delegation / root | task-team transient rows and the root display row | Kept; stable-row team branch removed |
| Web memory group path `[task, delegated]` | delegation | task team delegated inside a task team | Kept (fixture names reworded) |
| `launchReadiness.spec` / Org launch draft `/team` nodes | org → team | Org run settings | Kept |
| Docs: delegation chains ("nested task-Team chain"), definition-folder subteams, migration history | delegation / definitions / migrations | — | Kept; 6 runtime-shape statements fixed (see Key Files) |

## Key Files Or Areas

- Server src (≈30): `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts`,
  `agent-team-execution/domain/{team-run-config,team-run-execution-tree}.ts`, `agent-team-execution/services/{team-execution-index,team-run-execution-tree-mutator,team-run-execution-tree-builder,member-team-context-builder,flat-team-topology-planner}.ts`,
  `agent-team-execution/local/{flat-team-execution-factory,registries/*}.ts`, `agent-team-execution/task-delegation/*`,
  `agent-org-execution/services/{agent-org-execution-index,agent-org-run-execution-tree-mutator,agent-org-task-execution-adapter,agent-org-agent-status-snapshot-projector}.ts`,
  `standalone-agent-run-root/services/{standalone-root-execution-index,standalone-root-tree-mutator,standalone-root-task-execution-adapter,standalone-root-location-service}.ts`,
  `agent-collaboration/**` (launch selection, stop set, restore, projection, located structure, collaborator source projector, mention viewer, root team directory),
  `agent-memory/services/{collaboration-member-memory-targets,agent-memory-location-service}.ts`, `services/agent-streaming/{team-execution-view-projector,collaboration-execution-tree-dto-projection}.ts`.
- Contracts: `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`, both `dist/`.
- Web src: `services/teamExecution/*`, `services/collaborators/agentSourceSelectors.ts`, `services/runConfigEditing/*`, `services/runHydration/teamRunContextHydrationService.ts`,
  `services/agentOrgExecution/{agentOrgExecutionViewIndex,agentOrgTeamBranchStatus}.ts`, `services/agentCollaboration/agentRunCollaborationIndex.ts`,
  `stores/{runHistoryTeamRows,runHistoryTeamExecutionRows,agentTeamRunStore,teamRunConfigStore,chatDraftStore}.ts`, `types/agent/TeamRunConfig.ts`,
  `utils/{teamDefinitionMembers,teamRunLaunchHierarchy,teamWorkspaceLaunchPreparation,teamRunConfigUtils,agentOrgHistoryRows}.ts`, `utils/runSettings/{delegatedLaunchRows,runMemberTree}.ts`,
  `components/workspace/history/{WorkspaceStableExecutionRow.vue,WorkspaceTeamExecutionTree.vue,useRevealSelectedTreeRow.ts}` (deleted `workspaceHistoryTeamBranchStatus.ts`),
  localization `en` / `zh-CN` (`agentTeams`, `agentTeams.generated`, `workspace`), `README.md`, `package.json` (two probe scripts removed).
- Tests/fixtures: server fixture `tests/fixtures/current-team-run-v2/case-001-delegated-task-team-forest` (renamed; the former member team is now a
  task team delegated inside the task team), `tests/fixtures/collaboration-public-projection-fixtures.ts`, `tests/fixtures/current-team-run-fixtures.ts` (agents only),
  rewritten unit specs; new `tests/unit/standalone-agent-run-root/standalone-root-location-containment.test.ts`; web `test-support/currentTeamTestFixtures.ts`
  (`testSubTeamNode` → `testTaskTeamLayout`: a team delegation records its layout as the copy's catalog `source`), rewritten specs and e2e fixture pages/probes.
- Removed tests (retired shapes): server e2e `run-history/nested-team-history-restart.e2e.test.ts` (seeds a v1 team run with configured sub-teams;
  **fails identically on the base build** at its first projection read — line 299/456, `TEST_GRAPHQL_REQUEST_FAILED` — because the root-team parser accepts
  agent members only since v1.4.70), `runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` (live-gated; launches a team with a configured sub-team);
  web probes `nested-team-hierarchy` / `nested-team-aggregate-status` (+ fixture pages, scripts, README sections), `workspaceHistoryTeamBranchStatus.spec.ts`,
  configured-sub-team cases in `flat-team-execution-factory.test.ts`, `existingTeamModelConfigDraft.spec.ts`, `useDefinitionLaunchDefaults.spec.ts`,
  `WorkspaceAgentRunsTreePanel.spec.ts` (5), `WorkspaceHistoryWorkspaceSection.spec.ts` (2).
- Docs (runtime-shape statements only): web `docs/{memory,agent_orgs,workspace_layout,settings}.md`, server `docs/modules/agent_memory.md`.
- `DESIGN.md` rule 7 (from upstream).
- Baseline fixes (separate commits `66c61595d2`, `4ec3dd9eb3`; the probe parts are listed under Local Implementation Checks): `autobyteus-web/components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` — fails on base `db00ba16a9`:
  baseline commit `a3f65bfe6e` moved the editor draft from `FileExplorerTabs`'s local `fileContent` into the store's `editorDraft`; the spec still read
  `vm.fileContent`. It now asserts `files.getActiveFileData('C')?.editorDraft`.

## Important Assumptions

- No install holds the retired shape (DEC-008); the release-note line declares it unsupported (below).
- A delegated task-Team copy in a flat team run always records a catalog `source` (no configured team placement can exist at its address); web
  fallbacks that looked up a configured sub-team at the copy's address were dead and are removed (e.g. coordinator falls back to `team.address`).

## Known Risks

- Launch-configuration team scopes (follow-up 1, out of scope): removing `TeamDefinitionAgentTeamNode` (in scope) made the team branches in
  `teamRunLaunchHierarchy.ts` / `teamWorkspaceLaunchPreparation.ts` unreachable; only those branches were removed. `teamOverrides`, `teamsByAddress`,
  `ResolvedTeamScopeView` and the `CONFIGURED_TEAM` model scope are untouched; non-root team overrides are still pruned as stale exactly as before.
- R-3 (accepted): with an unreadable standalone tree, every cross-run scan logs the warning again.
- The three changed web probes were run and pass (see Frontend Rendered-Result Check); other web probes were not run.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: removal / narrowing plus one containment refinement.
- Reviewed root-cause classification: dead representations of a retired shape across layers.
- Reviewed refactor decision: `No Refactor Needed` beyond the removals.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no tolerant reader; retired data fails to parse and is contained).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (incl. `sameSnakeLaunch`, `resolvedTeamRunLaunchConfigsEqual`, `flattenLeafAgentMemberNodes`,
  `flattenTeamMemberNodesForDisplay`, `collectConfiguredTeams`, `findConfiguredTeamByAddress`, `hasSubTeams`, the `workspace.history.hierarchy.role.agent_team`
  and `AgentTeamDetail.viewNestedTeamLabel` strings).
- Dead code found elsewhere, listed as follow-up: `autobyteus-web/utils/application/applicationLaunch.ts` — `buildPreparedAgentLaunch`,
  `buildPreparedTeamLaunch` and the `Prepared*ApplicationLaunch` types have no callers (unrelated to nested teams; only an unused parameter was renamed here).
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes` — no changed source file over 500 effective lines or grown while over it (largest: `chatDraftStore.ts` 500, unchanged size).

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` for supported data; the retired shape is explicitly retired (DEC-001 e), contained, never changed.
- Implementation follows it without an unapproved migration or version-specific fallback: `Yes`
- Released migrations re-verified (SR-006: "None"): migrations import frozen shapes (`app-data-migrations/legacy/released-run-package-shapes/*`,
  `team-run-execution-tree-v1-types.ts`) and were not edited; `git diff --stat -- autobyteus-server-ts/src/app-data-migrations` is empty.
- Deviation: `None`

## Environment Or Dependency Notes

- Contracts `dist/` are tracked and were rebuilt (`pnpm test` in each package builds first).
- Server build output of `autobyteus-application-backend-sdk/dist`, `autobyteus-application-sdk-contracts/dist` (untracked) is not committed.

## Local Implementation Checks Run

All on the worktree build; never the user's app or `~/.autobyteus`.

- Server typecheck (`pnpm -C autobyteus-server-ts typecheck`, build config): pass. Server build (`pnpm run build`): pass.
  The test-program typecheck (`tsconfig.json` incl. tests) is not clean on the base either (≈10k pre-existing errors, not a project
  gate); none of its errors in files changed here concern the removed shapes.
- Server unit (`vitest run tests/unit`): 709 files / 5716 tests pass, 4 files skipped.
- Server integration (`test:integration:prepare`, `test:integration`): 75 files pass; only the 2 documented baseline
  `agent-status-websocket.integration.test.ts` content-cadence cases fail (TESTING.md "Known baseline exception").
- Contracts: `autobyteus-team-stream-contracts` 16 tests pass; `autobyteus-collaboration-stream-contracts` 27 tests pass (each `pnpm test`
  builds `dist` first).
- Web (`NUXT_TEST=true vitest run`, after `nuxt prepare`): 627 files / 4381 tests pass, 2 files skipped.
- AC-001 search evidence (excluding `app-data-migrations`, `dist`, tickets): no hit for `TaskTeamNestedTeamExecution`, `TaskTeamMemberExecution`,
  `isTaskTeamNestedTeamExecution`, `TaskTeamNestedTeamExecutionDto`, `TaskTeamNestedExecutionDto`, `TaskTeamMemberExecutionDto`,
  `ConfiguredTeamExecutionDto`, `ConfiguredMemberExecutionDto`, `projectNestedTaskTeam`, `cloneTeamRunNode`, `hasSubTeams`,
  `TeamDefinitionAgentTeamNode`, `testSubTeamNode`, `StoredTeamRunTeamNode`, `collectConfiguredTeams`; remaining `configured_team` /
  `task_team_member` / "nested" / "sub-team" hits are classified in the table above (org teams, root row, delegation, definitions, JSON).
- AC-002 server test: `tests/unit/standalone-agent-run-root/standalone-root-location-containment.test.ts` (scan skips + warns naming the run,
  finds and lists the others, sync and async; explicit root id throws for all three methods, no warning; sha256 of every file unchanged).
- AC-002 real-app check, isolated worktree build (`pnpm --silent isolated-app start --build --keep`, instance `iso-56931-8751`, auto data root,
  stopped and data root removed afterwards). Seeded with the build's own `StandaloneRootPackageStore`: readable trees `rnt-host-a/rnt-child-a`,
  `rnt-host-c/rnt-child-c`, and `rnt-host-b` truncated. Results (evidence `evidence/real-app-ds002/`):
  - `/rest/health` ok; the app started normally with the unreadable tree present;
  - `getRunFileChanges(runId: "rnt-child-c")` → `{"data":{"getRunFileChanges":[]}}` (cross-run scan past host-b; no error), log:
    `Skipping standalone run 'rnt-host-b': its collaboration tree cannot be read: Unexpected end of JSON input` (2 warnings for the 3 scans
    that reached host-b; `rnt-child-a` is found before host-b);
  - `agentRunCollaborationMemberProjection(rnt-host-c, /reviewer, rnt-child-c)` → `agentRunId: "rnt-child-c"`;
    `agentRunCollaboration(runId: "rnt-host-c")` → the tree; opening `rnt-host-b` (either query) → error `Unexpected end of JSON input`;
  - sha256 of all three tree files identical before and after (`before.sha` / `after.sha` / `after2.sha`).
- Retired e2e `nested-team-history-restart.e2e.test.ts` run on the base build (`/Users/normy/autobyteus_org/autobyteus-worktrees/rnt-base-check`,
  removed afterwards) fails identically to this branch (`evidence/nested-team-history-restart-on-base.log`).
- Baseline fixes found by Rule 9 (separate commits): `RightSideTabs.workspaceTarget.spec.ts` (above); three web probes failed on the base on an
  unrouted `/ws/agent-package-definitions` socket (console errors) and `background-agent-renderer-contention` BG-BROWSER-004 expected a `/worker`
  disclosure that task-Agent peer rows no longer have — both fixed in the probes and verified on the base first.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Workspaces history tree for team runs (stable member rows, delegated task-Team rows), live team members
  panel/navigation, run settings / existing-run model config, memory explorer groups.
- References: design-spec BEH-003 and the Removal plan; existing printed-tree grammar and people-group identity (unchanged components).
- Surface used (TESTING.md: self-starting browser probes against fixture pages of production components):
  - `node tests/e2e/task-agent-peer-sidebar-probe.mjs` → Pass (PEER-001..003): peers, task-Team containment and ancestor auto-reveal now
    `team:peer-task-team` only, levels 2, keyboard/pointer selection, retained reload; screenshot `evidence/web-probes/task-team-containment.png`
    shows the Research task-Team row (group icon) with its member and the member's delegated task Agent beneath it;
  - `node tests/e2e/team-group-icon-probe.mjs` → Pass (B01..B04): Team icons in transient/agent/team parents at 1440/768, Org groups, memory
    configured/task/delegated group paths;
  - `node tests/e2e/background-agent-renderer-contention-probe.mjs` → Pass (BG-BROWSER-000..007): hierarchy under sustained traffic.
- Visual/interaction issues found and corrected: none in product code; probe expectations updated (configured sub-team rows gone).
- Remaining unverified: no live team run with a real delegated task Team was driven in the isolated desktop app (needs model keys);
  covered by the probes and unit specs above.

## Release-Note Line (for delivery)

"Task agent team records with a nested sub-team, created by v1.4.53–v1.4.69, are no longer supported. A run containing one is no longer shown
(team / organization runs) or cannot be opened (standalone runs); its files are kept."

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 at API level: a data root with two readable standalone collaboration trees and one truncated tree; `getRunFileChanges` / member-run projection
  for a child in a readable tree succeeds; the server log names the skipped run; an explicit open of the unreadable run reports its error; no file changes.
- AC-003: Org run with a mounted Team plus a delegated task team copy; team run whose member delegates a task team that delegates a task team
  (delegation forest) — views, restore, status, Settings, Token Meter, Task pages unchanged.
- Server scripted e2e in a clean environment (`env -i PATH HOME=<tmp> TMPDIR`), especially `tests/e2e/projects/*` delegation suites and
  `tests/e2e/run-history/*`, now that the two retired-shape e2e files are gone.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Owned by `api_e2e_engineer`: AC-002 / AC-003 executable coverage, the updated web probes, server scripted e2e in a clean environment.
