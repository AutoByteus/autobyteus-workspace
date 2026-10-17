# Docs Sync Report — delegated-team-aggregate-status

## Scope

- Ticket: `delegated-team-aggregate-status` (Project Task `project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56`)
- Trigger: API-REV-001 Pass (95%) from `/software_engineering_team/api_e2e_engineer`, direct route (`task_size=Medium`, `architectural_risk=Low`). Architecture review, code review and test-code review: `N/A — not applicable`.
- Bootstrap base reference: `origin/personal` @ `927796780`
- Integrated base reference used for docs sync: `origin/personal` @ `bd45af839` (v1.4.99), merged into the ticket branch as `2b7648350`
- Post-integration verification reference: `release-deployment-report.md` § "Initial Delivery Integration Refresh"; logs in `delivery-evidence/`

## Why Docs Were Updated

- Summary: The approved behavior (AP-001) replaces three different Team-row status meanings with one universal Team status. The old meanings were a binary "alive = blue" cue on TEAMS run and group rows, no status on delegated Team rows, and a five-state aggregate on mounted Team rows. The long-lived docs described the old binary cue and the five-state aggregate as intended design (`TeamActivityDot`, `hasActiveRuns`, `running > initializing > …`), which would mislead future work.
- Why this should live in long-lived project docs: The rule owner (`resolveTeamStatus`), what counts (shown Agents, collapsed included, closed work excluded), the liveness gate, and the authority boundary (presentation-only; Stop/archive/delete still driven by `isActive`) are durable runtime knowledge. They are not ticket-local details.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` (§ Runtime Status And Interrupt Authority) | Named by design spec (l.404-433); described binary `TeamActivityDot` + `hasActiveRuns` and the five-state mounted-Team summary | Updated | Canonical description of the universal rule, owner, per-root counting, rendering and authority boundary |
| `autobyteus-web/docs/settings.md` (l.436-447) | Duplicate of the binary-cue paragraph (found by grep, not listed in design spec) | Updated | Replaced with a short summary and a link to the canonical section |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` (l.196-201) | Named by design spec; "binary team activity without creating an aggregate team status" | Updated | Bridge rule now states the client-side universal projection |
| `autobyteus-web/docs/agent_teams.md` (l.167-173) | Named by design spec; "restored Team can be Active while every Agent is Offline" | Updated | Paragraph added: universal dot; the restored-but-not-started Team reads gray with Stop kept (ASM-002) |
| `autobyteus-web/docs/agent_orgs.md` (§ Status And Hierarchy) | Described mounted-Team aggregate as `running > initializing > …` (found by grep) | Updated | Now covers mounted and task Teams, starting as busy, closed work excluded, the `live` gate, and the Org root row as not a Team |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` (l.315-318) | Same five-state precedence stated for the web row | Updated | States the web-side universal status; server sends no Team status |
| `autobyteus-server-ts/docs/modules/projects.md` (l.789-791) | Said Project Task worker status uses "the same rule as the web" | Updated | Clarifies the server worker status keeps the shared fold (`initializing` stays). Web Team rows map starting to busy |
| `TESTING.md` | New live probe | No change (by Delivery) | API/E2E already added "Universal Team status (live)" with the command, prerequisites and limits; verified accurate on the integrated state |
| `autobyteus-web/docs/agent_orgs.md` l.612, `agent_execution_architecture.md` l.340/1559/1843 | Mention root lifecycle / "mounted-Team aggregates" as separate authorities | No change | Still accurate: the Team status remains a separate, presentation-only fact |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Replace | Binary-cue and mounted-Team-summary paragraphs replaced. The new text covers the universal rule, the `resolveTeamStatus` owner, four-value `TeamStatus`, counting per root (Team / Agent / Org runs), rendering via `TeamAggregateStatusDot`, the accessibility text, ASM-001 freshness, ASM-002, and the server worker status difference. It also notes the unmounted `running/*` binary surface | Canonical truth for the new behavior |
| `autobyteus-web/docs/settings.md` | Replace | Binary-cue duplicate → summary + link | Remove obsolete duplicate |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Replace bullet | Binary team activity → client-side universal projection; Stop/archive/delete still `isActive` | Bridge contract accuracy |
| `autobyteus-web/docs/agent_teams.md` | Add paragraph | Universal Team dot on every Team row, ranking and colours, the group row, the stopped run as gray, and the restored Team as gray with Stop | Team-facing doc accuracy (SCN-004) |
| `autobyteus-web/docs/agent_orgs.md` | Replace | Org Team rows (mounted + task) use the universal rule with the `live` gate | Org-facing doc accuracy (SCN-003) |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Replace bullet | Precedence corrected; derived on the client | Cross-package accuracy |
| `autobyteus-server-ts/docs/modules/projects.md` | Clarify | Worker status ≠ web Team-row status for a starting Team | Removes the now-false "same rule as the web" |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Universal Team status rule | busy (running/initializing) > error > idle > offline; offline when the run is not alive; one owner `resolveTeamStatus` | requirements-doc REQ-001..004; design-spec | `agent_execution_architecture.md` |
| What counts | Agents shown under the row, collapsed included; closed task work excluded; each Agent counts with its own row's status | REQ-002; implementation-handoff | `agent_execution_architecture.md`, `agent_orgs.md` |
| Per-root counting points | `teamBranchStatus`/`teamRunStatus`/`teamDefinitionGroupStatus`; `listTaskRows.teamStatus`; `projectAgentOrgTeamBranchStatus`/`projectAgentOrgTaskTeamStatus` | implementation-handoff | `agent_execution_architecture.md` |
| Authority boundary | Presentation-only; Stop/archive/delete still from `isActive`; not transported or persisted | REQ-007; design-spec | all updated docs |
| Freshness (ASM-001) | Agent-run hosts never selected and Orgs never opened show a snapshot / gray | requirements ASM-001; investigation R-002 | `agent_execution_architecture.md` |
| Server vs web difference | Project Task worker status keeps the shared fold (`initializing`) | requirements Out Of Scope | `projects.md`, `agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Binary `TeamActivityDot` on Workspaces-tree TEAMS run/group rows | `TeamAggregateStatusDot` with `teamRunStatus` / `teamDefinitionGroupStatus` | `agent_execution_architecture.md` |
| `hasActiveRuns` on `WorkspaceHistoryTeamDefinitionDisplayGroup` | `teamDefinitionGroupStatus(runs)` | `agent_execution_architecture.md` |
| `aggregateTeamBranchAgentStatus` | `teamBranchStatus` | `agent_execution_architecture.md` |
| Five-state Team aggregate (amber "starting" Team) | Four-value `TeamStatus` (starting → busy) | `agent_execution_architecture.md`, `agent_orgs.md`, server `agent_orgs.md` |
| Localization keys `team_status_initializing`, section `active_team_runs`/`no_active_team_runs`/`active_team_run`/`inactive_team_run` | Removed (dead) | Implementation handoff (no long-lived doc referenced them) |
| `components/workspace/running/*` + `TeamActivityDot.vue` | Kept, unmounted; follow-up removal | `agent_execution_architecture.md` (noted as scheduled for removal) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not applicable — docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary → explicit user verification (AC-011) on an isolated worktree build.
- Notes: Two passages not listed in the design spec (`settings.md`, both `agent_orgs.md` files, `projects.md`) were found by grep and synced. They described the same superseded behavior.
