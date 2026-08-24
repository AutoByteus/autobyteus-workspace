# Agent-Team Run Journey — Prototype Parity Analysis

## Analysis Status

- Package: `initial-prototype-baseline`
- Requirements revision: `RER-009`
- Date: 2026-08-24
- Workspace: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline`
- Branch: `codex/initial-prototype-baseline`
- Worktree base: `origin/personal` commit `52b4be02ea793f2071fe5a63a94664ab25196433`
- Approved observable source pin retained for parity: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Finding: **Confirmed blocking current-experience parity defect**

## User-Reported Journey

1. Open Agent Teams.
2. Choose a team and activate **Run**.
3. Continue through the workspace team-run setup.
4. Start the team.
5. See the new team run in the left workspace tree and be able to select/expand it.

The user reports that the source product supports this journey but the prototype does not.

## Reproduction

Controlled prototype run:

- URL: `http://127.0.0.1:3210/agent-teams?view=team-list`
- Scenario/context: `populated` / `desktop`
- Team: `Product Review Team`
- Before action: one enabled `Run` button; left panel says `No run history yet.`
- Action: click `Run`.
- Actual result: route remains `/agent-teams?view=team-list`; left panel still says `No run history yet.`
- Browser error: `inFlightDrafts.keys is not a function`.

Evidence:

- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/tickets/in-progress/initial-prototype-baseline/evidence/agent-team-run-prototype-reproduction.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/tickets/in-progress/initial-prototype-baseline/evidence/agent-team-run-prototype-after-click.png`

## Source Behavior Evidence

The intended journey is not a newly invented future-state behavior. It is present in the approved source pin and retained source code:

- `autobyteus-web/components/agentTeams/AgentTeamList.vue:204-206` prepares the selected team draft and routes to `/workspace`.
- `autobyteus-web/components/workspace/config/RunConfigPanel.vue:356-385` validates the configured draft and calls `agentTeamRunStore.launchDraft(...)`.
- `autobyteus-web/stores/agentTeamRunStore.ts:309-346` creates the team run, hydrates its context, registers it in `agentTeamContexts`, promotes selection to the real team-run ID, and completes the draft launch.
- `autobyteus-web/stores/runHistoryReadModel.ts:298-329` merges persisted team runs and live team contexts into workspace-scoped left-tree team nodes.
- The same launch and left-tree obligations are present at approved source pin `8ef282ba...`; therefore this correction does not require changing the source pin or silently refreshing the entire prototype to a later frontend revision.

Source test evidence also covers the underlying obligations:

- `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` verifies that **Run Team** invokes `launchDraft` with the selected draft.
- `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` verifies draft launch, context registration, selection promotion, failure recovery, and later canonical launch.
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` verifies workspace-grouped team rows and team selection.

## Root Causes

### RC-001 — Map-backed team draft state is corrupted during snapshot hydration

`teamRunConfigStore` requires `drafts` and `inFlightDrafts` to be `Map` instances (`stores/teamRunConfigStore.ts:153-174`). The prototype state plugin loads JSON snapshot state through a JSON clone and `$patch` (`plugins/00.prototype-state.client.ts:263-270`) but normalizes `Map` fields only for the workspace and file-explorer stores (`:280-287`).

On the Agent Teams page, `teamRunConfig.inFlightDrafts` is therefore a plain object. `setTemplate()` calls `createDraft()`, which calls `assertNoInFlightDraft()` and then `.keys()`, producing the observed uncaught error.

### RC-002 — The actual team-launch action is replaced with a no-op

The prototype state plugin allowlists local actions by store. It allowlists selected `teamRunConfig` and `agentTeamContexts` actions but has no `agentTeamRun` entry (`plugins/00.prototype-state.client.ts:17-35`). All non-allowlisted actions are replaced with generic `actionResult(...)` wrappers (`:292-318`). `actionResult` has no `launchDraft` implementation and returns `undefined` by default.

Consequently, even after Map hydration is corrected, **Run Team** cannot create a deterministic synthetic team context, promote selection, or update the left tree unless the prototype implements the accepted launch outcome explicitly.

### RC-003 — Existing evidence never exercises the cross-surface launch journey

The baseline proves the Agent Teams route presentation (`ROUTE-007`), team detail (`JRN-005`), create validation (`JRN-033`), delete confirmation (`JRN-034`), and pre-seeded workspace team states (`JRN-023`–`JRN-025`, `JRN-047`, `JRN-049`). It does not exercise:

`Agent Teams card Run -> workspace draft -> valid configuration -> Run Team -> new left-tree team row`.

The interaction-discovery audit classified source tests but did not execute this critical browser journey. Retaining presentation files byte-for-byte also did not validate the prototype-specific snapshot/action adapter. This allowed 49/49 recorded journeys and 73/73 package checks to pass despite the blocker.

## Required Correction Boundary

The prototype correction must:

1. Preserve Map-backed team launch state through snapshot hydration and client-side navigation.
2. Make the Agent Teams card **Run** action navigate to `/workspace` with a valid selected team draft and without browser errors.
3. Provide deterministic synthetic workspace/runtime/model readiness sufficient to exercise **Run Team** without production services or credentials.
4. Implement a deterministic synthetic `launchDraft` outcome that creates exactly one team run/context for the selected definition, selects it, and projects it under the chosen workspace in the left tree.
5. Keep the new left-tree team row visible, expandable/selectable, and associated with its configured members/focused coordinator as in the source behavior.
6. Add an end-to-end controlled journey for the entire flow and make it part of terminal package validation. A route screenshot, pre-seeded workspace state, or source-test classification alone is insufficient.
7. Preserve all unrelated approved routes, journeys, final references, source pin, PPA-001, deterministic isolation, repository-root placement, and the five unrelated `ui-prototypes/*` projects.

## Non-Goals

- No production backend, real agent execution, credentials, or production writes.
- No visual redesign or new team-run behavior beyond the approved source.
- No architecture or production-engineering handoff.
- No whole-baseline refresh to a source revision newer than `8ef282ba...` unless a separate requirement explicitly requests it.
