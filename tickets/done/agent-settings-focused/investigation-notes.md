# Investigation Notes

## Investigation Meta

- Package identifier: `agent-settings-focused` (Project Task `autobyteus-366`)
- Request / ticket: autobyteus-366. Analysis first: where a team member's settings live; and Settings that show one agent. The user decides; nothing is changed before that
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `codex/agent-settings-focused`
- Resolved base: `origin/personal` @ `c952758a816c38c8ea0beacf351edf4e958e0117` (fetched 2026-11-02)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created. No build or install yet (analysis only)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: `SKILL.md`, `references/requirements-engineering.md` (this conversation, 2026-11-01)
- Investigation status: complete for the analysis. The Settings design waits for the user's answers

## Initial Request And Clarifications

- Original request: the Task and its comment, read with `get_project_task`. The user: "a lot of times I just want to update the setting for one individual agent... when it's focused, the setting should show one individual agent's setting." And: "a team consists of individual members, and an individual member is still an agent run itself"; today "the execution tree itself still takes the complete individual configuration"; "I'm not sure whether it's a good idea or not."
- The PM: tell autobyteus-348's Solution Designer anything that affects it; ask the user directly what he must decide; do not put "the user has verified" into Done-when.

## Source Log

| Type | Source | Finding | ID |
| --- | --- | --- | --- |
| Code | `run-history/domain/run-execution-tree-shared-records.ts:26-34` | A configured member's record in the tree: `address`, `agentDefinitionId`, `role`, `description`, `agentRunId`, `platformAgentRunId`, `launchConfiguration` (runtime, model, model settings, tool approval, workspace) | E-01 |
| Code | `agent-team-execution/domain/team-run-execution-tree.ts:25-55` | The team's own part of the tree: definition, coordinator, `defaultLaunchConfiguration`, `members`, `taskExecutions`, handoffs, `applicationBinding`, `createdAt`, `archivedAt`, `delegatedFrom` | E-02 |
| Data | The user's data, **names and sizes only** (no content read): a team folder holds `team_run_execution_tree.json`, the message log and one folder per member with `raw_traces_*`, `file_changes.json`, `seen_*`, `work_journal`. **No `run_metadata.json` for a member** | A member's own memory already lives in its own folder; only its settings live in the tree | E-03 |
| Code | `run-history/store/agent-run-metadata-types.ts:7-33,85-97` | A standalone run's `AgentRunMetadata` holds the same fields, plus `pendingRuntimeSwitch` (autobyteus-316). A delegated copy has a `TaskAgentRunMetadata` own file with a `taskAgent` section (started launch plus `userLaunchSelection` beside it) | E-04 |
| Code | `run-execution-tree-shared-records.ts:52-130` | A member of a delegated Team copy: `source.members[]` (`launchConfiguration`, `followsTeam`, `launchSource`) in the copy's own tree, `TaskTeamAgentExecution` (`platformAgentRunId`, `userLaunchSelection`), and a team-level `userTeamLaunchSelection` | E-05 |
| Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` CM-8, CM-9, CM-10; `tickets/done/delegated-copy-own-run-memory/memory-layout-contract.md` §0, H1, H2 | A **delegated** run "never becomes a part of its coordinating run … A run owns its own content; the coordinator owns the relationship." A message "between parts of one run" is stored once in that run. Copies got own files for a months-long hub that keeps growing (one PM run ≈265 MB of task agents) and for delegation to other nodes. The user confirmed that direction on 2026-10-17 | E-06 |
| Code | `run-history/store/task-execution-tree-split.ts:26-37`, `task-agent-own-files.ts` | Compose at load, split at save exists for task executions. L5: a task agent without a readable own file is left out and reported, and the rest of the run loads | E-07 |
| Code | `run-history/services/team-run-history-service.ts:62-74`; `workspace-run-history-service.ts:71,85` | Listing the runs reads each team's tree, one after another | E-08 |
| Code | `agent-team-execution/services/team-run-model-config-mutator.ts:8-44` | One Settings save patches scopes (`CONFIGURED_TEAM`, `CONFIGURED_AGENT`) in the one tree, committed as one atomic file | E-09 |
| Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue:17`; `ExistingRunConfigEditor.vue:120-152`; `components/run-settings/ExistingRunSettings.vue:43-80`; `stores/existingRunConfigStore.ts:59-61` | Settings loads by the **selected run** (`agent` / `team` / `agent_org`), ignoring the focused member, and always draws the root card, then "Members", then "Delegated copies" | E-10 |
| Code | `stores/agentRunCollaborationStore.ts` `selectedChild`; `services/teamExecution/teamExecutionViewState.ts` `getFocusedAgentRunId`; Org `focus` | The focused member or copy is already known on the client, and its data is already in the loaded draft | E-11 |
| Doc | `tickets/in-progress/runtime-switch-members/design-spec.md` D-1, D-2, Persisted Data (worktree `runtime-switch-members` @ `3261712e06`, code review Pass, 2026-11-02) | autobyteus-348 puts `pendingRuntimeSwitch` on the tree records through one pure rule with adapters. Its limit: "the Team/Org must be stopped for the edit (existing rule)" | E-12 |

## Measurements

| ID | Method | Observation | Evidence |
| --- | --- | --- | --- |
| M-01 | `stat` on the user's trees (sizes only) | 721 team trees, 4.7 MB in total, median 5.2 KB, max 16 KB. 26 org trees, 0.6 MB, median 28 KB, max 31 KB. About 3,190 member folders (3,016 + 171) | this row |
| M-02 | Synthetic files in a temp folder, sized like M-01: reading 721 trees of 5 KB, against 721 smaller trees plus 4 own files each; sequential per team as `listTeamRunHistory` does; 5 samples, load average 20–30 | 42 ms against 152 ms: **3.6×** for every run listing. File reads and JSON parsing only, not the whole request | `evidence/M-read-cost-synthetic.json` |
| M-03 | `git diff` of the autobyteus-348 branch | 78 source files, 20 commits, to carry one pending switch across the member record kinds | this row |

## Persisted Data And State Facts

- Today no stored data is affected by the Settings fix.
- Moving members to own files would touch 721 team trees and 26 org trees and write about 3,190 new files on the user's install, and likewise on every other node (Docker nodes migrate themselves).

## Supplemental Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| `storage-analysis.md` | The first deliverable: the analysis and recommendation for the user | Ready for the user |
| `evidence/M-read-cost-synthetic.json` | M-02 | Current |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| U-01 | Unknown | The full cost of option B was estimated from the code, not built | Accepted for a decision; the estimate is labelled as such |
| R-01 | Risk | The Settings work overlaps autobyteus-348 in the web (`ExistingRunSettings.vue`, `RunMemberRow.vue`, `ExistingRunConfigEditor.vue`, `existingRunConfigStore.ts`, `delegatedLaunchRows.ts`, `runMemberTree.ts`) | Build after 348 merges; its Solution Designer is told |
