# Investigation Notes

## Investigation Meta

- Package identifier: `phone-settings-every-run-522`
- Request / ticket: autobyteus-522 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), "Phone Settings (runtime and model) for the members of a task agent team and for task agents"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/phone-settings-every-run-522`
- Resolved base remote / branch / revision: `origin/personal` at `3722dbb1d8` (fetched 2026-11-17 20:39)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` passed (`/tmp/abt522/*.log`)
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: requirements gate `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (2026-11-17); design gate `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (2026-11-17)
- Investigation status: Complete (founder's case reproduced; every kind traced and probed on the node)

## Initial Request And Clarifications

- Original request (founder, read by the PM, 2026-11-17 20:30, with two phone screenshots): "for the members belonging to a task agent team, for an agent team member, I don't have this Settings, but it only appears for the individual agents. I don't understand why. Is it a feature or ..."
- Clarification (Task comment, founder's voice): he sees no difference between a standalone agent, an agent team, an organization, a task agent and a task agent team: they are all runs, so Settings should be the same for all. No special case per kind on the phone's Settings; decide by what the run can do (change runtime and model while stopped), not by its kind. Check every kind; say in the design which kinds exist, each one's stopped-run update call, and whether any kind truly cannot be changed (then say why in the phone's words, not by hiding the entry).
- Constraints from the Task: the approved phone design stays (Settings entry, one screen, Save returns to the conversation); a team member's setting is that member's own (as in 458); the phone-key rule (441) keeps stop and stopped-run updates allowed; test in the phone probe and on an isolated node with scripted runtimes, reproduce the founder's case first, include a team inside an org; release only on the founder's word.

## Product And Domain Understanding

- Product area: the phone shell's run screen ⋮ menu and its Settings screen (autobyteus-458, delivered in v1.5.13-beta.9).
- Kinds of opened run (the phone's `ActiveAgentWorkspaceTarget.kind`, `autobyteus-web/types/workspace/activeAgentWorkspaceTarget.ts:47-102`): `standalone_agent`, `standalone_team_member`, `agent_org_direct_agent`, `agent_org_team_member`, `agent_org_task_agent`, `agent_org_task_team_member`, `agent_run_task_agent`, `agent_run_task_team_member`. A delegated run (task agent or task team, `collaboration_model.md` § 1) is a run of its own since autobyteus-461, bound to its Task.
- Terminology: GLOSSARY.md and `collaboration_model.md` § 1 (task agent, task team, delegated run, remote node, peer). No new domain word.

## Source Log

| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-web/utils/mobile/mobileRunSettingsScope.ts:14-27` | The Settings decision | Switch on `target.kind`: four kinds return a scope; every other kind returns `null` |
| 2026-11-17 | Code | `components/mobile/runScreen/MobileRunTargetView.vue:80-81` | Menu entry | `showSettings = mobileRunSettingsScope(target) !== null && !remote` |
| 2026-11-17 | Code | `components/mobile/views/MobileRunSettings.vue:87-155` | The screen | Loads `useExistingRunConfigStore` by scope kind (agent / team / agent_org); edits the scope's address; stop subject from the scope |
| 2026-11-17 | Code | `types/agent/agentRunReadSubject.ts:1-17` | What each target says about its owning run | `target.browse` names the run that holds the agent: `run` (an agent run, delegated ones too), `teamMember` (team run + the member's address in that team run's own space), `agentOrgMember` (Org run + address), `peerRun` (a run on another node) |
| 2026-11-17 | Code | `stores/activeContextStore.ts:61-99`, `services/agentOrgExecution/agentOrgExecutionContext.ts:139-149`, `stores/delegatedRunsStore.ts:159-180` | Where `browse` is built for each kind | standalone agent: `run`; standalone Team member: `teamMember` (root team, focused member); Org members: `agentOrgMember`; any delegated run: its own binding's `browse` (`run` for an agent run, `teamMember` of its own team run, `peerRun` on a peer) |
| 2026-11-17 | Code | `stores/activeContextStore.ts:80-89` | A run delegated by a standalone Team's member, opened in the Team's tree | Built as kind `standalone_team_member` with the Team's `team` view (whose focused member is the Team's) but the delegated run's own `context` and `browse` |
| 2026-11-17 | Code | `stores/agentRunCollaborationStore.ts:216-229`, `stores/agentOrgContextsStore.ts:229-245` | Delegated kinds | `agent_run_task_agent` / `agent_run_task_team_member` (under a standalone agent), `agent_org_task_agent` / `agent_org_task_team_member` (under an Org); a peer's run shows as `*_task_agent` with `browse.kind = 'peerRun'` |
| 2026-11-17 | Code | `components/workspace/config/ExistingRunConfigEditor.vue:225-250`, `services/runConfigEditing/delegatedLaunchSelectionClient.ts` | The desktop for delegated runs (348, 461 SR-064…066) | Each delegated run is reached as itself: options by `agentRunModelOptions` / `teamRunModelOptions`, save by `updateStoppedAgentRunSelection` / `updateStoppedTeamRunSelections`, stop by `terminateAgentRun` / `terminateAgentTeamRun`; a peer's row is read-only (`delegatedLaunchRows.ts:145,205,219,242`) |
| 2026-11-17 | Code | `stores/existingRunConfigStore.ts:171-229`, `stores/runHistoryStore.ts:350-388` | The phone's load | `loadAgentCanonical(runId)` → `getAgentRunResumeConfig`; `loadTeamCanonical(teamRunId)` → `getTeamRunResumeConfig`: by run id, no run-list membership needed |
| 2026-11-17 | Code | `composables/runSettings/useRunStopAction.ts:40-45`, `stores/delegatedRunsStore.ts:184-191` | Stop | The Settings stop calls `agentRunStore.terminateRun` / `agentTeamRunStore.terminateTeamRun` / the Org stop, the same calls the delegated runs' own Stop uses |
| 2026-11-17 | Code | `autobyteus-server-ts/src/run-history/services/studio-run-model-config-service.ts:42-161`, `run-history/domain/run-model-config.ts:38-51` | Node side | The same resume-config reads and stopped-run updates serve every agent and team run by id; editability `RUN_ACTIVE` / `RUN_ARCHIVED` / `NOT_FOUND` |
| 2026-11-17 | Code | `autobyteus-server-ts/src/remote-collaboration/channel/peer-gateway.ts:163-174`, `agent-collaboration/execution/remote/remote-run-channel.ts:68-72`, `api/rest/remote.ts:33-42` | Can a run on another node be changed from this node? | No: the peer owner commands are `post_message`, `interrupt`, `terminate` only; no peer route changes a run's runtime or model |
| 2026-11-17 | Contract | `autobyteus-server-ts/docs/design/node_access_model.md` NA-7 and the "Later (slice 2, autobyteus-441)" row | Phone-key rule | A phone reaches every GraphQL operation except owner actions; 441 is not delivered (no phone operation list in `src/`). Resume-config reads, model options, stopped-run updates and terminate are not owner actions: allowed |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | ⋮ on a standalone agent, a standalone Team member, an Org's own agent or Org Team member | `mobileRunSettingsScope` returns a scope | Settings offered; works (458) | R1 `standaloneAgent`, `teamMember` | Reproduced |
| BEH-002 | User | ⋮ on a task agent or a task team's member of a standalone agent (the founder's case) | kind `agent_run_task_*` → scope `null` | No Settings, running or stopped | R1 `ptmTaskAgent`, `ptmTaskTeamMember`, `ptmTaskTeamMemberStopped`; screenshot `r1/MSP-R522-ptm-task-team-member-menu.png` (the founder's screenshot's menu) | Reproduced |
| BEH-003 | User | ⋮ on an Org's task agent or task team's member | kind `agent_org_task_*` → `null` | No Settings | Code (`mobileRunSettingsScope.ts:24`); phone case R2 | Read; R2 |
| BEH-004 | User | ⋮ on a run on another node (a peer's task run) | `&& !remote` | No Settings, no explanation | R1 `peerAgent` (chip "beta-node") | Reproduced |
| BEH-005 | User | ⋮ on a task agent a standalone Team's member delegated, opened in the Team's tree | kind `standalone_team_member` → scope = the Team run at the Team's focused member | Settings offered under the task agent's name, but the rows and Save are the Team member's: a Save changed the lead, not the helper | R1 `teamMemberTaskAgent`; code `activeContextStore.ts:80-89`; R2 `before`/`after` | Reproduced |
| BEH-006 | System | Node: a delegated agent or team run, live / stopped | `getAgentRunResumeConfig`, `getTeamRunResumeConfig`, `*ModelOptions`, `terminate*`, `updateStopped*` by the run's own id | live: `isActive true`, `RUN_ACTIVE`; stopped: editable; Save `UPDATED`; only the saved run (or member) changes | R1 `node.*` | Reproduced |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1: `env -i PATH HOME=/tmp/abt522/home TMPDIR pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-R522 --output-dir=/tmp/abt522/r1` (alpha + beta probe nodes, scripted Antigravity; the temporary case module below) | Phone ⋮ on each kind | standalone agent and Team member: `[artifacts, files, (messages), activity, settings]`; the PTM's task agent `[artifacts, files, activity]`; the PTM's task team's reviewer `[artifacts, files, messages, activity]` (Idle and Stopped); the peer's publisher (chip `beta-node`) `[artifacts, files, activity]`; the Delivery Team lead's task agent "changelog helper": Settings offered | Reproduced | The founder's case; the peer case; BEH-005 | `evidence/investigation/r1/mobile-shell-probe.json`, `r1/*.png` |
| R1 node side | A task agent of the PTM, of a Team member, of an Org; the PTM's task team | live: `isActive true`, `editable false`, `RUN_ACTIVE`; model options readable; `terminate*` success; stopped: `editable true`; `updateStoppedAgentRunSelection` → `UPDATED`, metadata `grok_build/grok-4.7`; `updateStoppedTeamRunSelections` (`/reviewer`) → `UPDATED`, reviewer changed, editor unchanged | Reproduced | The node serves every delegated run like any run of its kind; no server change | same JSON, `node.*` |
| R1 | Org task team | The Org planner's second `delegate_task` (to the Team) did not produce a row within 90 s (the first, a task agent, did) | Observed | Retried in R2 | `orgDelegated` |
| R2: same command, `--cases=MSP-R522B`, output `/tmp/abt522/r2` | (a) The Delivery Team lead's task agent "changelog helper", both stopped: ⋮ → Settings (subject "changelog helper · Stopped · in lead"), Runtime → Grok Build, Model → Grok 4.7, Save | Before: lead and helper `antigravity_cli/gemini-3.8-flash-low`. After Save: **lead `grok_build/grok-4.7`, helper unchanged** | Reproduced | BEH-005: today's Settings on that screen changes another agent (the Team member) | `evidence/investigation/r2/mobile-shell-probe.json` (`before`, `after`), `r2/MSP-R522B-helper-settings-changed.png` |
| R2 (b), (c) | An Org's task team; the phone on an Org's delegated rows | The Org planner's `delegate_task` to `/docs_review_team` (three attempts, 60 s each) produced no delegated row; in R1 its `delegate_task` to `/changelog_helper` did. With no delegated row, (c) had nothing to open | Observed | U-002 | `r2/mobile-shell-probe.json` (`orgTaskTeam`, `orgOpenError`) |

- Temporary diagnostics: `autobyteus-web/tests/e2e/mobile-settings-every-run-repro-cases.mjs` (the reproduction cases MSP-R522, MSP-R522B) and two lines in `mobile-shell-probe.mjs` that import and run it (marked `TEMP autobyteus-522`). Removed from the worktree before handoff; a copy of the module is kept as `evidence/investigation/mobile-settings-every-run-repro-cases.mjs`.
- Reproduction for implementation to start from: that copy; implementation turns it into the ticket's probe cases (design spec, Verification).

## External Contracts, Standards, And Dependencies

| Contract | Relevant behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Node Access Model NA-7, 441 not delivered | A phone may call the reads, stop and stopped-run updates this ticket uses | `node_access_model.md` | None now; 441 must keep them (458 REQ-010) |
| Collaboration Model (delegated runs are runs of their own, 461) | A delegated run's settings are its own run's | `collaboration_model.md`; `delegatedLaunchSelectionClient.ts` header | None |
| Peer protocol | No remote change of runtime/model | `peer-gateway.ts:163-174` | A run on another node stays unchangeable from this node |

## Persisted Data And State Facts

- No stored shape changes. The node's existing stopped-run updates write the run's own metadata or team tree, as for any run (R1).

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/investigation/r1/`, `r2/` | Solution Designer | Reproduction evidence | Final |
| `evidence/investigation/mobile-settings-every-run-repro-cases.mjs` | Solution Designer | The reproduction, for implementation to turn into probe cases | Final (not wired into the probe) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-001 | Unknown | Which run a Save on a Team member's task agent changes (BEH-005) | R2 (a): the Team member's (the lead's), not the task agent's | Resolved |
| U-002 | Unknown | Whether the probe's Org planner (scripted runtime, `CALL_TOOL`) can delegate a Team; R1 and R2 got no task-team row (a task agent worked in R1). The phone's path for an Org's task team member is the same as for the PTM's (its own team run's `browse`, `stores/agentOrgContextsStore.ts:239-244`), and the node side of a task team is proven (R1 `ptmTaskTeam`) | API/E2E establishes an Org's task team for AC-004 (another recipient, or the Org's coordinator); if an Org agent truly cannot delegate a Team, record the evidence as a follow-up (outside this ticket) and cover AC-004's task-team half with the PTM case | Open (API/E2E) |

## Notes For Architecture Design

- Every opened target already names its owning run (`target.browse`), built by the run's own open (its binding for delegated runs). Deciding Settings from `browse` covers every kind with no per-kind list, matches the founder's direction, and fixes BEH-005, where `kind` and `team` describe the host Team but `browse` the delegated run.
- No server change; no new GraphQL operation; the phone uses the same store and calls as for 458's kinds.
