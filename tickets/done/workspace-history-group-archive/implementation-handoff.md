# Implementation Handoff — `workspace-history-group-archive`

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive` · branch `codex/workspace-history-group-archive` · base `origin/personal` @ `4a51482a5` · implementation commit `9faa6bc75` (source + tests; ticket artifacts left uncommitted like the upstream package).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (`Medium` + `Low`); independent architecture review not selected.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/requirements-doc.md` (SR-003: SR-002 baseline + "SR-003 Approved Delta", which governs where it differs)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/design-spec.md` (SR-003)
- Supplemental task artifacts: None (no behavior-defining supplements).
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial).

## Current Implementation Summary

Each agent, agent team and Agent Org group header in the Workspaces sidebar now has an "Archive all runs" icon button. It is revealed on hover/focus like the row archive icon. On click:

1. If any run of the group is running (agent: a visible saved run with `isActive`; team: `isActive` or `deleteLifecycle !== 'READY'`; org: `isActive`), one warning toast "Stop running runs first." is shown. No dialog opens and nothing is archived.
2. Otherwise a confirmation dialog opens: "Archive all runs?" with "{name} · {N} runs will be hidden from history." for team/org, or "{name} — all runs will be hidden from history." for agent groups, since hidden runs aren't counted on the client.
3. On confirm:
   - Agent groups: the new server mutation `archiveStoredAgentRunGroup(workspaceRootPath, agentDefinitionId)` selects every unarchived stored run of that agent in that (canonicalized) workspace, including runs beyond the 6-run listing cap. If any is active it archives nothing and returns `activeRunIds`, and the UI shows the same blocked message. Otherwise it archives each run through the existing catalog `archiveRun` (same guards).
   - Team and Org groups: the listed runs are archived sequentially with the existing per-run mutations (through the extracted store cores).
   - Every kind refreshes the history tree once and the run-navigation topology once (`group-archive`), cleans local state per archived run (contexts, selection), and shows one short toast: "Archived N runs." / "Archived N runs. M failed." / "Archive failed. Try again."
   - For Org groups, the open Org route is left when its run was archived.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 15 tracked files plus 4 new (2 source, 2 spec), +571/−26 lines, all inside the existing run-history ownership. One additive GraphQL mutation composes the existing per-run catalog archive (same active guard, same `archivedAt`). No schema, persistence, concurrency or runtime-owner change. Neither escalation trigger fired: the client agent-group `workspaceRootPath` matched the server catalog rows through `canonicalizeWorkspaceRootPath` (verified in the real app with 8 runs incl. 2 hidden), and per-run index flushes were not noticeably slow for that group.
- Selected route: `Direct API/E2E` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes` (found and fixed: an agent-header `+` spacing regression; a confirmation-message HTML-escaping defect, see Known Risks / notes)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002 (agent) / DS-001, DS-003 | Archive all stored runs of (workspace, agent), all-or-nothing, incl. beyond the cap | `WorkspaceHistoryWorkspaceSection.vue` agent header button → `useWorkspaceHistoryGroupArchive.onArchiveAgentGroup` → `confirmGroupArchive` → `runHistoryStore.archiveAgentRunGroup` → `archiveAgentRunGroupInHistoryStore` (GraphQL `ArchiveStoredAgentRunGroup`) → `RunHistoryResolver.archiveStoredAgentRunGroup` → `AgentRunHistoryService.archiveStoredAgentRunGroup` → `AgentRunHistoryCatalogService.archiveRun` per run | Implemented. Real app: 8 stored runs (6 shown) all archived; another agent in the same workspace untouched; run folders kept |
| BEH-002 (team) / DS-002 | Archive all listed team runs; blocked if any active / not READY | Team header button → `onArchiveTeamGroup` → `runHistoryStore.archiveTeamRuns` → `archiveTeamRunsInHistoryStore` → `archiveTeamRunRecord` per id → one refresh | Implemented. Real app: 2 runs archived, one toast |
| BEH-002 (org) / DS-002 | Archive all listed Org runs; blocked if any active; leave open archived Org route | Org header button (`WorkspaceAgentOrgHistoryCollection.vue`) → `onArchiveAgentOrgGroup` → `runHistoryStore.archiveAgentOrgRuns` → `archiveAgentOrgRunRecord` per id → one refresh → `leaveRemovedAgentOrgRoute` per archived id | Implemented. Real app: 2 runs archived; open Org route returned to `#/workspace` |
| REQ-003 / AC-004 | Confirmation; Cancel changes nothing | `ConfirmationModal` bound to `showGroupArchiveConfirmation` / `closeGroupArchiveConfirmation` | Real app: Cancel → 0 index rows archived |
| REQ-004 (rev) / AC-005, AC-008 (rev) | Running run → no dialog, nothing archived, short error | `requestGroupArchive(target, hasBlockingRun)`; server re-check via `activeRunIds` | Composable, panel and server unit tests; not rendered in the real app (needs a live runtime) |
| AC-010 | Run started after confirmation | Agent: server active check archives nothing; team/org: per-run guard → counted as failed | Server unit test (all-or-nothing, catalog refusal → failed) |
| REQ-005 (rev) / QR-003 | One short summary toast | `reportOutcome` | Real app: "Archived 2 runs."; partial/failed wording covered by composable tests |
| REQ-006 / QR-001 / AC-007 | Pending disables the header; one refresh; open run closed | `archivingGroupKeys` + `isGroupArchiving` state; `refreshAfterGroupArchive`; per-run cleanup helpers | Store tests assert one refresh + one topology refresh and selection cleanup |
| REQ-007 (rev) | Shown whenever the group has a saved run | Agent: `canArchiveAgentGroup` (any `source === 'history'`); team/org: always (groups only exist with runs) | Header component tests (drafts-only agent group → hidden) |
| QR-002 / AC-001 | Keyboard reachable, aria-label | `<button>` with `title`/`aria-label` "Archive all runs", `focus:opacity-100` | Real app: focus reveals the icon with a focus ring |
| BEH-001 / AC-009 | Per-run archive/delete unchanged | Per-run store actions = extracted core + refresh (same contract) | All existing per-run tests green |
| BEH-003 | 6-run listing cap unchanged | `listRunHistory` untouched | Real app: header still shows (6) of 8 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server
- `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` — `archiveStoredAgentRunGroup`, `ArchiveStoredAgentRunGroupResult`
- `autobyteus-server-ts/src/api/graphql/types/run-history.ts` — `ArchiveStoredAgentRunGroupMutationResult`, `archiveStoredAgentRunGroup` mutation (input errors propagate as GraphQL errors)
- `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts` — 4 new cases

Web
- `autobyteus-web/composables/useWorkspaceHistoryGroupArchive.ts` (new) — group UI policy + exported group keys and `canArchiveAgentGroup`
- `autobyteus-web/stores/runHistoryMutationActions.ts` — extracted cores, group actions
- `autobyteus-web/stores/runHistoryStore.ts` — `archiveAgentRunGroup`, `archiveTeamRuns`, `archiveAgentOrgRuns`
- `autobyteus-web/stores/runHistoryTypes.ts` — `RunGroupArchiveOutcome`, `AgentRunGroupArchiveOutcome`, mutation data type
- `autobyteus-web/graphql/mutations/runHistoryMutations.ts` — `ArchiveStoredAgentRunGroup`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` — agent header (`group/agent-header`, actions container) and team header (row `div.group/team-header`, no nested buttons)
- `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` — org header (`div.group/org-header`)
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` — wiring, third modal, shared `leaveRemovedAgentOrgRoute`
- `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` — optional `isGroupArchiving` state + three optional group actions
- `autobyteus-web/utils/escapeHtml.ts` (new) — moved from the panel; used by both panel confirmations
- `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` — `workspace.history.groupArchive.*`
- Tests: `composables/__tests__/useWorkspaceHistoryGroupArchive.spec.ts` (new, 10), `components/workspace/history/__tests__/WorkspaceHistoryGroupArchiveHeaders.spec.ts` (new, 6), `stores/__tests__/runHistoryStore.spec.ts` (+6), `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (+3)

## Important Assumptions

- Blocked-message wording: revised AC-005 quotes "1 run of <group> is still running. Stop it first, then archive all.", while QR-003 and the design's Messages example specify "Stop running runs first." I followed QR-003 / the design, since QR-003 is the later, user-requested "keep the messages clean" constraint. Solution Designer may confirm.
- Section action signatures follow the design exactly: `onArchiveAgentGroup(workspaceNode, agentNode)`, `onArchiveTeamGroup(workspacePresentationId, group)`, `onArchiveAgentOrgGroup(workspacePresentationId, group)`. The new contract members are optional, like the existing Org members, so the many existing section fixtures and probe pages stay valid; headers render the button only when the host provides the action.
- Store outcome field names follow the server (`archivedRunIds` / `activeRunIds` / `failedRunIds`) rather than the design's shorthand `archivedIds` / `failedIds`, so there is one representation end to end.
- The `warning` toast type maps to the existing `info` toast via the panel's `addWorkspaceToast`, as for per-run warnings.

## Known Risks

- `runHistoryStore.ts` is at 498 effective non-empty lines (limit 500). To stay under, the mutation-actions import was compacted and the group actions are one-liners. The next addition to this store should come with a split.
- Self-review fix (recorded for reviewers): `ConfirmationModal` renders `message` with `v-html`, and the localization runtime decodes HTML entities after interpolation. So the message is escaped as a whole after translation, not by its parameters. Covered by a composable test with an Org named `Research <Org>`.
- One standalone index flush per archived run on the server (accepted by the design).
- RSK-001 merge overlap with `codex/run-continuity-after-agent-definition-rename` (`WorkspaceAgentOrgHistoryCollection.vue` header/rows; standalone catalog).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed` (only the planned per-run store core extraction)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: Group UI policy lives in its own composable, so `useWorkspaceHistoryMutations.ts` is unchanged. Components call only section actions/state; the composable calls only injected store functions; the resolver only delegates to the service.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` (inline refresh bodies of the per-run team/org archive replaced by core + refresh; the panel's local `escapeHtml` replaced by the shared util; duplicated org route-cleanup lambda replaced by `leaveRemovedAgentOrgRoute`)
- Shared structures remain tight: `Yes` (`AgentRunGroupArchiveOutcome extends RunGroupArchiveOutcome` adds only `activeRunIds`)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest: `runHistoryStore.ts` 498, `WorkspaceAgentRunsTreePanel.vue` 486, `WorkspaceHistoryWorkspaceSection.vue` 453; largest source delta 85 lines)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes` — only the existing writers set `archivedAt`
- Direct-use evidence: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree setup needed `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts exec prisma generate`, `pnpm -C autobyteus-server-ts prepare:shared` (its `pretest`), and `pnpm -C autobyteus-web exec nuxi prepare`. `prepare:shared` leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (build output; not committed).
- `vue-tsc` isn't installed in the workspace, so `.vue` files were not type-checked by a CLI. `.ts` sources were checked with `tsc`.

## Local Implementation Checks Run

All are implementation-scoped local checks, not API/E2E sign-off.

- Server unit: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-history-service.test.ts --no-watch` → 9/9 pass (4 new: >cap + canonical root + scoping, all-or-nothing, catalog refusal → failed, input validation).
- Server schema/regression: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` → 2/2 pass. This builds the full GraphQL schema including the new mutation.
- Server broader: `vitest run tests/unit/run-history tests/integration/run-history tests/e2e/workspaces tests/unit/api/graphql` → 320 pass / 11 fail; the **same 11 fail on the base** (stash check). Causes (TESTING rule 9; outside this ticket's scope, reported, not fixed here):
  - `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` (3) and `codex-mcp-tool-args-projection.integration.test.ts` (1): the test `agentRunManager` double lacks `beginActivation`, which `StandaloneAgentRunLifecycleService.activatePrepared` now calls.
  - `tests/unit/api/graphql/converters/workspace-converter.test.ts` (2): the fixture workspace has no `metadata`, which `WorkspaceConverter.toGraphql` now reads.
  - `tests/unit/api/graphql/studio-application-api-services.test.ts` (1): the test registers an incomplete service set ("Complete Studio application API services are required").
  - `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` (1, remove/re-add workspace): removal fails with "AgentRunManager is not initialized" in the test harness.
  - `tests/unit/api/graphql/types/memory-view-member-resolver.test.ts` (2): org/team member memory views return `null`, while the test expects facts. The test setup no longer matches the current member-view read path.
  - `tests/unit/api/graphql/types/projects.test.ts` (1): the resolver now returns one more field per project than the test's exact `toEqual` expects.
- Server typecheck: `tsc --noEmit -p tsconfig.build.json` → 0 errors. `pnpm typecheck` (`tsconfig.json`) reports only TS6059 "not under rootDir". That is pre-existing: `rootDir: "src"` combined with `include: ["src","tests"]`. Non-TS6059 errors: 0.
- Web targeted: `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts composables/__tests__/useWorkspaceHistoryGroupArchive.spec.ts components/workspace/history/__tests__ --run` → all pass (history components 171, store 53, composable 10).
- Web full: `pnpm -C autobyteus-web test:nuxt --run` → 3949 pass / 10 fail. All 10 are in `components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` and **fail identically on the base**. Cause: the component formats currency with the host's default locale (this host renders `0,0020 $`), while the test expects `$0.0020`. Environment/locale-dependent, unrelated; reported.
- Web guards: `guard:web-boundary` pass; `guard:localization-boundary` pass (a first draft of my spec imported the catalog directly and was fixed to use the runtime); `audit:localization-literals` pass.
- Web typecheck (`tsc --noEmit -p tsconfig.json`, `.ts` only): no errors in changed source files. Changed spec files only show the environment-wide `.vue` module-resolution TS2307 plus a pre-existing `runHistoryStore.spec.ts:2484` error. The baseline total is ~620 errors.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Workspaces sidebar — agent, team and Org group headers; group confirmation dialog; summary toast; Org route cleanup.
- Approved UI/UX, interaction, requirement, or design references: requirements REQ-001..007 / QR-002 / QR-003; design "Guidance For Implementation" (button style, placement, data-test ids, team header restructure).
- Existing design system, shared components, and adjacent product surfaces reviewed: row archive buttons (amber hover, `md:opacity-0` hover/focus reveal), the workspace-row remove button, `ConfirmationModal`, `ToastContainer`, the agent header `+`.
- Testing guideline and rendered surface used: TESTING.md rules 1–2 — isolated desktop instance built from this worktree (`pnpm --silent isolated-app start --build`), driven with browser-automation on its control port. Seed data: test-owned memory in the instance's private data root, written by a temporary untracked vitest file using the real stores (8 stopped runs of "Tutorial Video Producer (old)", 1 run of "Keeper Agent", 2 "English Bridge Team" runs, 2 "Delivery Org" runs) plus a workspace registered through the instance's GraphQL. The temp seed file was deleted after use.
- States, layouts, viewports, and interactions inspected (1200×768 window): all four headers render the button, hidden at rest (opacity 0) with the `+` still rightmost. Keyboard focus reveals it with a focus ring. Agent confirmation text; Cancel → nothing archived (server index checked). Confirm → all 8 runs archived on the server, including the 2 hidden by the cap; Keeper untouched; run folders kept; group removed from the sidebar. Team: counted confirmation, "Archived 2 runs." toast, Teams section removed. Org: counted confirmation, toast, Orgs section removed, open Org route `#/workspace?rootSubjectKind=agent_org…&orgRunId=wsga-org-run-2…` → `#/workspace`.
- Visual or interaction issues found and corrected: the agent header `+` margin regression (an `ml-2 → ml-1` change in my first draft) was fixed with an `ml-2 gap-1` actions container; the HTML-escaping defect in the confirmation message was fixed.
- Supporting evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/implementation-evidence/` (`01-agent-header-hover.png`, `02-agent-header-focus*.png`, `03-agent-confirm.png`, `04-team-archived-toast.png`, plus final-build captures listed below).
- Remaining unverified states or limitations: real CSS `:hover` reveal can't be triggered by script-dispatched events (focus reveal verified instead; hover classes mirror the row buttons). Running-run blocked path, partial-failure toast and pending/disabled state were not rendered in the real app: they need a live runtime or fault injection, and are covered by composable/panel/store/server tests. zh-CN strings were checked in the catalog and the localization guard, not rendered.
- Final-build check: the first instance (`iso-54410-a3d3`) was built before the agent-header spacing fix. I rebuilt from the current source and repeated the check on `iso-54892-8f59`, with the same seed:
  - Agent header geometry (toggle ends at x=256, archive 264–284, `+` 288–308 inside the 316px header edge with its 8px padding), so `+` stays rightmost and the `ml-2` spacing is restored.
  - Focus reveal (opacity 1), dialog text "Tutorial Video Producer (old) — all runs will be hidden from history.", toast "Archived 8 runs.", server index with all 8 old runs archived and the Keeper run live.
  - Evidence: `05-final-build-agent-focus.png`, `06-final-build-agent-archived-toast.png`.
  - Both instances were stopped with their private data roots removed (`isolated-app list` → none). The temporary seed file was deleted.

## Downstream Coverage Hints / Suggested Scenarios

- Server GraphQL E2E (design step 1; left to API/E2E as owner): extend `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`:
  - >6 stopped runs of one agent in one workspace + runs in another workspace and of another agent → `archiveStoredAgentRunGroup` archives exactly the group, files kept.
  - The group with one active run (`run-agent-active` harness) → `activeRunIds` non-empty, nothing archived.
  - Empty inputs → GraphQL error.
- Real product: a running standalone run in the group → click → "Stop running runs first.", no dialog; stop it → Archive all succeeds (AC-005 rev).
- Team with a running run, or a team run in a non-READY delete lifecycle → blocked. Org with an active run → blocked.
- AC-010: start a run between confirmation and execution (agent → nothing archived + blocked toast; team/org → counted as failed).
- AC-007: archive a group whose run is open/selected → selection cleared.
- Per-run archive/delete regression (AC-009).
- zh-CN rendering of the dialog and toasts.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All API/E2E coverage and validation listed above, including the server GraphQL E2E for the new mutation, live-runtime blocked paths, and AC-010 timing.
- The baseline failures above (stale server test doubles; host-locale-dependent `TokenUsageMeterPanel.spec.ts`) need an owner. They are not caused by this change.
