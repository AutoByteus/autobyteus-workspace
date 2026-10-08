# Implementation Handoff — `archived-open-run-disappears`

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears` (branch `codex/archived-open-run-disappears`, base `origin/personal` @ `3a2496c95`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review not selected (`task_size=Small`, `architectural_risk=Low`); Solution Designer routed "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → implementation engineer.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/requirements-doc.md` (SR-002, approved 2026-10-08)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/design-spec.md` (SR-003)
- Architecture handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/handoff-architecture-design-complete.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

Removing a run (archive, "Archive all", delete) no longer opens anything in its place, and Chat never re-opens a removed or archived stored run:

1. `agentContextsStore.removeRun` and `agentTeamContextsStore.removeTeamContext` clear the selection when the removed run was selected. The auto-select of another loaded run or team is gone.
2. `pages/chat.vue` has a local `leaveToWorkspace()` (clear selection, `router.replace({ path: '/workspace' })`). When the displayed stored run's context vanishes (not a promotion), Chat leaves to the workspace empty view instead of re-opening it. A discarded draft (`temp-*`) still returns to New chat.
3. `openAgentRun` throws the new `ArchivedAgentRunOpenError { runId }` when resume config reports `modelConfigEditability.reason === 'RUN_ARCHIVED'` and `isActive === false`, before any Activity, context, selection or stream change. Chat's `ensureRunOpen` maps it to `leaveToWorkspace()` after the `openGeneration` check. Other callers treat it like any other open failure.
4. Org: unchanged.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: four web source files in existing owners (+29/−21 source lines); no server, GraphQL, persistence or contract change. The design's escalation trigger was checked and does not fire. The only non-test callers of `removeRun` are the archive/delete cleanup and `agentRunStore.closeAgent` (draft discard, called only from `WorkspaceAgentRunsTreePanel.removeDraftRun`). `removeTeamContext` has only the archive/delete cleanup (plus a test fixture page). The only `runs.delete` calls in non-test code are `removeRun` and `promoteTemporaryId`, and nothing reassigns `runs`. So no other path removes a displayed persisted context.
- Selected route: `Direct API/E2E` (per `get_handoff_rules`)
- Lightweight implementation self-review completed: `Yes` (see below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- Boundaries: stores and the coordinator do not navigate; Chat imports only the error class from the coordinator (allowed by the design's dependency rules). `pnpm -C autobyteus-web guard:web-boundary` passed.
- Safety net ordering: the archived check runs after the superseded-intent checks and before `currentContext`, the strategy decision, Activity replacement, `upsertProjectionContext`, selection and stream connect. A coordinator spec asserts none of these happen.
- `!isActive` guard: an archived run that is active still opens (spec), so active-run recovery is unaffected.
- `openGeneration`: the archived branch is after the existing generation check, so a superseded open never navigates.
- Vanish watcher: still guarded by `previous.state.runId === routeRunId` (promotion keeps its object with the new id). The redundant `getRun` re-check was removed because `displayedContext` is already null.
- `modelConfigEditability?.reason`: optional chaining on a required field, kept because existing coordinator fixtures omit it. It is not a compatibility branch.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Open agent run archived (row / Archive all) → `/workspace` empty state, no row, no other run | `runHistoryMutationActions` cleanup → `agentContextsStore.removeRun` (clears selection) → `chat.vue` vanish watcher → `leaveToWorkspace()` | Implemented; spec + live |
| BEH-002 | Open team / member view archived → empty state, no other team | cleanup → `agentTeamContextsStore.removeTeamContext` (clears selection) → `WorkspaceAdaptiveLayout` empty state | Implemented; spec + live (team view, member view, Archive all) |
| BEH-003 | Org archive → `/workspace` (preserved) | unchanged `leaveRemovedAgentOrgRoute` | Preserved; existing specs + live |
| BEH-004 | Running runs refused (preserved) | unchanged | Preserved; no code change; existing specs (not re-exercised live) |
| BEH-005 | Reload / restart / stale address → no archived run, empty view | `chat.vue ensureRunOpen` → `openWorkspaceExecutionLink` → `openAgentRun` throws `ArchivedAgentRunOpenError` → `leaveToWorkspace()` | Implemented; specs + live (reload, stale address, restart) |
| BEH-006 | Delete of open agent / team / member view / Org → empty view, no "chat not found", no jump | same paths as BEH-001/002/003 | Implemented; spec + live (agent, team member view) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/pages/chat.vue`: `leaveToWorkspace`, vanish watcher, archived-error mapping in `ensureRunOpen`
- `autobyteus-web/stores/agentContextsStore.ts`: `removeRun`
- `autobyteus-web/stores/agentTeamContextsStore.ts`: `removeTeamContext`
- `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`: `ArchivedAgentRunOpenError`, `isArchivedAndStopped`, check in `openAgentRun`
- Specs: `pages/__tests__/chat.spec.ts` (+4 cases, 1 assertion), `stores/__tests__/agentContextsStore.spec.ts` (auto-select case rewritten to the new invariant), `stores/__tests__/agentTeamContextsStore.spec.ts` (+2), `services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts` (+3), new `stores/__tests__/runHistoryOpenRunRemoval.integration.spec.ts` (7 cases, real run-history/context/selection stores, only Apollo stubbed)

## Important Assumptions

- `modelConfigEditability.reason === 'RUN_ARCHIVED'` is set exactly when the catalog row has `archivedAt` (design evidence, server `run-model-config.ts`). The only other reason value is `RUN_ACTIVE`.

## Known Risks

- Draft discard (`closeAgent`) of the selected draft now clears the selection instead of selecting another loaded run. On `/chat?id=temp-*` the route still returns to New chat (spec). No visible change was found elsewhere.
- After a window reload, previously loaded stopped runs (e.g. Keeper) are restored as loaded contexts; this existing behavior is unchanged and not selected.
- The Org leave-route still lives in the panel callback, while the agent leave-route lives in Chat. This is an accepted deferral in the design.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `No Refactor Needed` (beyond removing the obsolete branches)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the invariant is enforced in the owners named by the design; no new owner or service was added.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`. The auto-select branches and Chat's re-open of a vanished displayed run are removed, and the obsolete "should auto-select another runContext" spec was rewritten to the new invariant.
- Shared structures remain tight: `Yes` (one error class only)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (`chat.vue` 147 lines, coordinator 136; store files only shrank; source delta +29/−21)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree setup: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web exec nuxt prepare`. Seven web spec files import built workspace packages, so they need `pnpm -C autobyteus-application-sdk-contracts build`, `pnpm -C autobyteus-ts build` and `pnpm -C autobyteus-server-ts exec prisma generate` first. Without them they fail to resolve modules. These are environment prerequisites, not regressions; TESTING.md's web row does not mention them.
- The local branch is behind `origin/personal` by 13 commits (the base advanced after bootstrap). No rebase was done; integration is for the delivery stage.
- Untracked build outputs from the checks (`autobyteus-web/electron-dist/`, package `dist/`, Prisma client) are not committed.

## Local Implementation Checks Run

- Changed/new colocated specs: `pnpm -C autobyteus-web test:nuxt pages/__tests__/chat.spec.ts services/runOpen/__tests__ stores/__tests__/agentContextsStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/runHistoryOpenRunRemoval.integration.spec.ts --run`: all pass (chat 13, coordinator 9, store 12 + 7, integration 7, other runOpen specs unchanged and passing).
- Regression proof: with the four source files reverted and only the new specs present, 10 new cases fail. That is 5 in the unit/component specs (chat removal leave, chat stale archived address, coordinator refusal, agent store clear, team store clear) and 5 in the integration spec (archive/delete agent run, archive/delete team run, team Archive all), all from the old auto-select. Every one passes with the fix.
- Full web renderer suite: `pnpm -C autobyteus-web test:nuxt --run`. Result: 580 files passed, 2 skipped, 7 failed from unbuilt workspace packages / missing Prisma client (see Environment). After building those, the 7 files pass (24 tests). Net result: the suite is green.
- `pnpm -C autobyteus-web guard:web-boundary`: passed.
- `tsc --noEmit -p autobyteus-web/tsconfig.json`: 1012 pre-existing errors repo-wide. None are in changed source; the two hits in `agentContextsStore.spec.ts` (lines 26 and 274) are pre-existing and untouched.
- Not run: `test:electron` (no Electron main-process change).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Chat run view → workspace empty view after archive/delete; team and member views → empty view; stale chat address; reload/restart sidebar.
- Approved references: requirements REQ-001..REQ-008 / AC-001..AC-009, DEC-001 (workspace empty view). No new UI.
- Existing design system and adjacent surfaces reviewed: the existing `/workspace` empty state ("No agent or team run selected" / "Choose an agent or team" / "Open runs/history"), toasts and confirm dialogs, all unchanged.
- Surface used (TESTING.md "Isolated desktop instances"): `pnpm --silent isolated-app start --build` from this worktree (instance `iso-57630-957c`, private data root). The fake AGY CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`) was set in the data-root `.env`, and seeding went through the instance GraphQL with a temporary script outside the repo: 3 stopped "Open Agent" runs, 1 stopped "Keeper Agent" run, 3 stopped "Bridge Team" runs and 1 stopped "Delivery Org" run. It was driven with browser-automation on the control port. The fake CLI was spawned only at run creation; there were no model calls.
- States and interactions inspected:
  - AC-001/AC-007: Keeper loaded, Open Agent run open in Chat → row Archive → toast "Run archived.", `#/workspace` empty state at once (≤150 ms), the row is gone, Keeper is still loaded but not selected, no `local` row.
  - AC-005: window reload → the archived run is absent and there is no `local` row. Full app restart → the sidebar lists only Keeper.
  - AC-008: stale `#/chat?id=<archived run>` → `#/workspace` empty state within 300 ms; no context is created and no row appears.
  - AC-009 agent: row Delete → in-page confirm "Delete this history permanently…" → Delete → empty view, no "chat not found" page, Keeper not selected.
  - AC-002: Open Agent "Archive all" with its last run open → confirm "Archive all runs?" → empty view; the group is gone.
  - AC-003: team A loaded, team B open → row "Archive team history" → empty view, team A still loaded and not selected. Team "Archive all" with a member view open → empty view.
  - AC-009 team: member view open → "Delete team history permanently" → confirm → empty view, the other team is not selected.
  - AC-004: Org open (`#/workspace?rootSubjectKind=agent_org…`) → row Archive → `#/workspace` empty view (unchanged).
- Visual or interaction issues found and corrected: none. No spinner flash or "chat not found" page was observed.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-evidence/` (01 agent archived, 04 agent deleted, 05 team archived, 06 member view deleted, 07 Org archived, 08 after restart, `live-seed.json`).
- Cleanup: instance stopped (`dataRootRemoved: true`); temporary seed script, workspace folder and fake-CLI argv log removed. Another instance (`iso-63369-6c20`) belongs to a different worktree and was not touched.
- Remaining unverified: AC-006 (running-run refusal) was not exercised live (no code change; existing specs). Delete of an open Org was not exercised live (unchanged path). Browser Back in the web build was not exercised; the hash-route stale address covers the same `ensureRunOpen` path.

This is implementation self-validation, not API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Live: AC-006 with a running agent/team/Org run (refusal toast unchanged, nothing navigates).
- Live: Delete of an open Org run (AC-009 Org).
- Web build (`pnpm dev`): browser Back to an archived chat address.
- An archived run that was continued and is active stays openable (coordinator spec covers this; live optional).
- Draft discard on `/chat?id=temp-*` while another stored run is loaded → New chat, nothing else selected.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent executable validation and evidence for AC-001..AC-009 across agent, team (incl. member view) and Org, including reload/restart, per TESTING.md.
- Confirm the full web suite in a fully built environment.
